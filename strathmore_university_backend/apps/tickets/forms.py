from django import forms


class AcademicUploadForm(forms.Form):
    file = forms.FileField(
        help_text="Upload a CSV or XLSX file with the required columns shown below.",
    )
