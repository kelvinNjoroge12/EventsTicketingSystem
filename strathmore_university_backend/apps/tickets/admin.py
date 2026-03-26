from django.apps import apps
from django.contrib import admin, messages
from django.core.exceptions import PermissionDenied, ValidationError
from django.shortcuts import redirect
from django.template.response import TemplateResponse
from django.urls import path, reverse

from .forms import AcademicUploadForm
from .importers import import_courses_file, import_schools_file
from .models import Course, School


class AcademicUploadAdminMixin:
    change_list_template = "admin/tickets/academic_change_list.html"
    upload_template_name = "admin/tickets/academic_upload.html"
    upload_form_class = AcademicUploadForm
    upload_columns = ()
    upload_help_text = ""

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context["upload_url"] = reverse(
            f"admin:{self.model._meta.app_label}_{self.model._meta.model_name}_upload"
        )
        extra_context["upload_label"] = f"Upload {self.model._meta.verbose_name_plural}"
        return super().changelist_view(request, extra_context=extra_context)

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                "upload/",
                self.admin_site.admin_view(self.upload_view),
                name=f"{self.model._meta.app_label}_{self.model._meta.model_name}_upload",
            ),
        ]
        return custom_urls + urls

    def upload_view(self, request):
        if not self.has_change_permission(request):
            raise PermissionDenied

        form = self.upload_form_class(request.POST or None, request.FILES or None)
        if request.method == "POST" and form.is_valid():
            try:
                summary = self.handle_upload(form.cleaned_data["file"])
            except ValidationError as exc:
                form.add_error("file", exc.messages[0])
            else:
                self.message_user(
                    request,
                    (
                        f"Upload complete. Created {summary['created']}, updated {summary['updated']}, "
                        f"skipped {summary['skipped']} out of {summary['total']} rows."
                    ),
                    level=messages.SUCCESS,
                )
                for error in summary["errors"][:5]:
                    self.message_user(
                        request,
                        f"Row {error['row']}: {error['error']}",
                        level=messages.WARNING,
                    )
                return redirect(
                    reverse(f"admin:{self.model._meta.app_label}_{self.model._meta.model_name}_changelist")
                )

        context = {
            **self.admin_site.each_context(request),
            "opts": self.model._meta,
            "form": form,
            "title": f"Upload {self.model._meta.verbose_name_plural}",
            "upload_columns": self.upload_columns,
            "upload_help_text": self.upload_help_text,
            "changelist_url": reverse(
                f"admin:{self.model._meta.app_label}_{self.model._meta.model_name}_changelist"
            ),
        }
        return TemplateResponse(request, self.upload_template_name, context)

    def handle_upload(self, uploaded_file):  # pragma: no cover - overridden in subclasses
        raise NotImplementedError


@admin.register(School)
class SchoolAdmin(AcademicUploadAdminMixin, admin.ModelAdmin):
    list_display = ("name", "code", "is_active", "sort_order", "created_at")
    search_fields = ("name", "code")
    list_filter = ("is_active",)
    ordering = ("sort_order", "name")
    upload_columns = ("name", "code", "sort_order")
    upload_help_text = "Use one row per school. The name column is required."

    def handle_upload(self, uploaded_file):
        return import_schools_file(uploaded_file)


@admin.register(Course)
class CourseAdmin(AcademicUploadAdminMixin, admin.ModelAdmin):
    list_display = ("name", "school", "code", "is_active", "sort_order")
    search_fields = ("name", "code", "school__name")
    list_filter = ("is_active", "school")
    ordering = ("sort_order", "name")
    autocomplete_fields = ("school",)
    upload_columns = ("name", "code", "sort_order", "school (optional)")
    upload_help_text = "Use one row per course. The name column is required. The school column is optional."

    def handle_upload(self, uploaded_file):
        return import_courses_file(uploaded_file)


app_models = apps.get_app_config(__package__.split(".")[-1]).get_models()
for model in app_models:
    if model in {School, Course}:
        continue
    try:
        admin_class = type(
            f"{model.__name__}Admin",
            (admin.ModelAdmin,),
            {
                "list_display": [
                    field.name for field in model._meta.fields if field.name != "id"
                ][:5],
            },
        )
        admin.site.register(model, admin_class)
    except admin.sites.AlreadyRegistered:
        pass
