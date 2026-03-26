import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, User } from 'lucide-react';
import CustomInput from '../ui/CustomInput';
import CustomButton from '../ui/CustomButton';
import { api } from '../../lib/apiClient';

const OTHER_COURSE_OPTION_VALUE = '__other__';

const AttendeeForm = ({
  event,
  cart,
  onSubmit,
  themeColor,
}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [additionalAttendees, setAdditionalAttendees] = useState(
    Array(Math.max(0, cart.quantity - 1)).fill(null).map(() => ({
      firstName: '',
      lastName: '',
      email: '',
    }))
  );
  const [showAdditional, setShowAdditional] = useState(true);
  const [errors, setErrors] = useState({});
  const registration = cart?.registration || null;
  const fixedFields = registration?.fixedFields || {};
  const questions = Array.isArray(registration?.questions) ? registration.questions : [];

  const [registrationData, setRegistrationData] = useState({
    graduationYear: '',
    courseId: '',
    customCourseName: '',
    schoolId: '',
    admissionNumber: '',
    studentEmail: '',
    locationText: '',
    locationCity: '',
    locationCountry: '',
    locationLat: null,
    locationLng: null,
    answers: {},
  });

  const [schools, setSchools] = useState([]);
  const [courses, setCourses] = useState([]);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const isOtherCourseSelected = registrationData.courseId === OTHER_COURSE_OPTION_VALUE;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAdditionalChange = (index, field, value) => {
    setAdditionalAttendees(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    if (errors[`additional_${index}_${field}`]) {
      setErrors(prev => ({ ...prev, [`additional_${index}_${field}`]: '' }));
    }
  };

  useEffect(() => {
    if (!fixedFields.askSchool) return;
    api.get('/api/academics/schools/')
      .then((data) => setSchools(Array.isArray(data) ? data : []))
      .catch(() => setSchools([]));
  }, [fixedFields.askSchool]);

  useEffect(() => {
    if (!fixedFields.askCourse) return;
    if (fixedFields.askSchool && !registrationData.schoolId) {
      setCourses([]);
      return;
    }
    const query = registrationData.schoolId ? `?school=${registrationData.schoolId}` : '';
    api.get(`/api/academics/courses/${query}`)
      .then((data) => setCourses(Array.isArray(data) ? data : []))
      .catch(() => setCourses([]));
  }, [fixedFields.askCourse, fixedFields.askSchool, registrationData.schoolId]);

  useEffect(() => {
    if (!fixedFields.askLocation) return;
    const q = registrationData.locationText.trim();
    if (!q) {
      setLocationSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      setIsLocationLoading(true);
      try {
        const res = await api.get(`/api/locations/search/?q=${encodeURIComponent(q)}`);
        const results = res?.results || res || [];
        setLocationSuggestions(Array.isArray(results) ? results : []);
      } catch {
        setLocationSuggestions([]);
      } finally {
        setIsLocationLoading(false);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [fixedFields.askLocation, registrationData.locationText]);

  const validate = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (registration) {
      if (fixedFields.requireStudentEmail) {
        if (!registrationData.studentEmail.trim()) {
          newErrors.studentEmail = 'Student email is required';
        } else if (!registrationData.studentEmail.toLowerCase().endsWith('@strathmore.edu')) {
          newErrors.studentEmail = 'Student email must be a @strathmore.edu address';
        }
      }
      if (fixedFields.requireAdmissionNumber && !registrationData.admissionNumber.trim()) {
        newErrors.admissionNumber = 'Admission number is required';
      }
      if (fixedFields.askGraduationYear && !registrationData.graduationYear) {
        newErrors.graduationYear = 'Graduation year is required';
      }
      if (fixedFields.askSchool && !registrationData.schoolId) {
        newErrors.schoolId = 'School is required';
      }
      if (fixedFields.askCourse) {
        if (!registrationData.courseId) {
          newErrors.courseId = 'Course is required';
        } else if (isOtherCourseSelected && !registrationData.customCourseName.trim()) {
          newErrors.customCourseName = 'Course name is required';
        }
      }
      if (fixedFields.askLocation && !registrationData.locationText.trim()) {
        newErrors.locationText = 'Location is required';
      }
      questions.forEach((q) => {
        if (q.is_required && !registrationData.answers[q.id]) {
          newErrors[`question_${q.id}`] = `${q.label} is required`;
        }
      });
    }

    additionalAttendees.forEach((attendee, index) => {
      if (!attendee.firstName.trim()) {
        newErrors[`additional_${index}_firstName`] = 'First name is required';
      }
      if (!attendee.lastName.trim()) {
        newErrors[`additional_${index}_lastName`] = 'Last name is required';
      }
      if (!attendee.email.trim()) {
        newErrors[`additional_${index}_email`] = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendee.email)) {
        newErrors[`additional_${index}_email`] = 'Please enter a valid email';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({
        ...formData,
        additionalAttendees: cart.quantity > 1 ? additionalAttendees : [],
        registration: registration ? {
          category_id: registration.categoryId ?? registration.category_id ?? null,
          category_type: registration.categoryType ?? registration.category_type ?? '',
          category_label: registration.categoryLabel ?? registration.category_label ?? '',
          graduation_year: registrationData.graduationYear || null,
          course_id: isOtherCourseSelected ? null : registrationData.courseId || null,
          custom_course_name: isOtherCourseSelected ? registrationData.customCourseName.trim() : '',
          school_id: registrationData.schoolId || null,
          admission_number: registrationData.admissionNumber || '',
          student_email: registrationData.studentEmail || '',
          location_text: registrationData.locationText || '',
          location_city: registrationData.locationCity || '',
          location_country: registrationData.locationCountry || '',
          location_lat: registrationData.locationLat,
          location_lng: registrationData.locationLng,
          answers: questions.map((q) => ({
            question_id: q.id,
            value: registrationData.answers[q.id] || '',
          })),
        } : null,
      });
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <h2 className="text-xl font-semibold text-[#0F172A]">
        Attendee Details
      </h2>

      {/* Primary Attendee */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-[#64748B]">
          <User className="w-5 h-5" />
          <span className="text-sm">Primary Attendee</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CustomInput
            label="First Name"
            value={formData.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            error={errors.firstName}
            required
          />
          <CustomInput
            label="Last Name"
            value={formData.lastName}
            onChange={(e) => handleChange('lastName', e.target.value)}
            error={errors.lastName}
            required
          />
        </div>

        <CustomInput
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          error={errors.email}
          required
        />

        <CustomInput
          label="Phone Number"
          type="tel"
          value={formData.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          error={errors.phone}
          required
        />
      </div>

      {/* Category-Specific Registration */}
      {registration && (
        <>
          {fixedFields.requireStudentEmail && (
            <CustomInput
              label="Student Email"
              type="email"
              value={registrationData.studentEmail}
              onChange={(e) => setRegistrationData((prev) => ({ ...prev, studentEmail: e.target.value }))}
              error={errors.studentEmail}
              placeholder="name@strathmore.edu"
              required
            />
          )}

          {fixedFields.requireAdmissionNumber && (
            <CustomInput
              label="Admission Number"
              value={registrationData.admissionNumber}
              onChange={(e) => setRegistrationData((prev) => ({ ...prev, admissionNumber: e.target.value }))}
              error={errors.admissionNumber}
              required
            />
          )}

          {fixedFields.askGraduationYear && (
            <CustomInput
              label="Graduation Year"
              type="number"
              value={registrationData.graduationYear}
              onChange={(e) => setRegistrationData((prev) => ({ ...prev, graduationYear: e.target.value }))}
              error={errors.graduationYear}
              placeholder="e.g. 2026"
              required
            />
          )}

          {fixedFields.askSchool && (
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-2">School</label>
              <select
                value={registrationData.schoolId}
                onChange={(e) => {
                  const nextSchoolId = e.target.value;
                  setRegistrationData((prev) => ({
                    ...prev,
                    schoolId: nextSchoolId,
                    courseId: '',
                    customCourseName: '',
                  }));
                  if (errors.schoolId || errors.courseId || errors.customCourseName) {
                    setErrors((prev) => ({
                      ...prev,
                      schoolId: '',
                      courseId: '',
                      customCourseName: '',
                    }));
                  }
                }}
                className={`w-full px-4 py-2.5 bg-white border rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#02338D] ${errors.schoolId ? 'border-[#DC2626]' : 'border-[#E2E8F0]'}`}
              >
                <option value="">Select a school</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {errors.schoolId && <p className="mt-1.5 text-sm text-[#DC2626]">{errors.schoolId}</p>}
            </div>
          )}

          {fixedFields.askCourse && (
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-2">Course</label>
              <select
                value={registrationData.courseId}
                onChange={(e) => {
                  const nextCourseId = e.target.value;
                  setRegistrationData((prev) => ({
                    ...prev,
                    courseId: nextCourseId,
                    customCourseName: nextCourseId === OTHER_COURSE_OPTION_VALUE ? prev.customCourseName : '',
                  }));
                  if (errors.courseId || errors.customCourseName) {
                    setErrors((prev) => ({
                      ...prev,
                      courseId: '',
                      customCourseName: '',
                    }));
                  }
                }}
                className={`w-full px-4 py-2.5 bg-white border rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#02338D] ${errors.courseId ? 'border-[#DC2626]' : 'border-[#E2E8F0]'}`}
                disabled={fixedFields.askSchool && !registrationData.schoolId}
              >
                <option value="">{fixedFields.askSchool && !registrationData.schoolId ? 'Select a school first' : 'Select a course'}</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                <option value={OTHER_COURSE_OPTION_VALUE}>Other</option>
              </select>
              {errors.courseId && <p className="mt-1.5 text-sm text-[#DC2626]">{errors.courseId}</p>}
              {isOtherCourseSelected && (
                <div className="mt-3">
                  <CustomInput
                    label="Type your course"
                    value={registrationData.customCourseName}
                    onChange={(e) => {
                      const nextCourseName = e.target.value;
                      setRegistrationData((prev) => ({ ...prev, customCourseName: nextCourseName }));
                      if (errors.customCourseName) {
                        setErrors((prev) => ({ ...prev, customCourseName: '' }));
                      }
                    }}
                    error={errors.customCourseName}
                    placeholder="Enter your course name"
                    required
                  />
                </div>
              )}
            </div>
          )}

          {fixedFields.askLocation && (
            <div className="relative">
              <CustomInput
                label="Location"
                value={registrationData.locationText}
                onChange={(e) => setRegistrationData((prev) => ({ ...prev, locationText: e.target.value }))}
                error={errors.locationText}
                placeholder="Start typing your location..."
                required
              />
              {locationSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-[#E2E8F0] rounded-lg shadow-lg z-10 max-h-48 overflow-auto">
                  {locationSuggestions.map((item, idx) => (
                    <button
                      type="button"
                      key={`${item.label}-${idx}`}
                      onClick={() => {
                        setRegistrationData((prev) => ({
                          ...prev,
                          locationText: item.label || '',
                          locationCity: item.city || '',
                          locationCountry: item.country || '',
                          locationLat: item.lat ?? null,
                          locationLng: item.lng ?? null,
                        }));
                        setLocationSuggestions([]);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-[#F8FAFC]"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
              {isLocationLoading && (
                <p className="text-xs text-[#94A3B8] mt-1">Searching locations...</p>
              )}
            </div>
          )}

          {questions.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-[#0F172A]">Additional Questions</p>
              {questions.map((q) => (
                <div key={q.id}>
                  <label className="block text-sm font-medium text-[#0F172A] mb-2">{q.label}</label>
                  {q.field_type === 'dropdown' ? (
                    <select
                      value={registrationData.answers[q.id] || ''}
                      onChange={(e) => setRegistrationData((prev) => ({
                        ...prev,
                        answers: { ...prev.answers, [q.id]: e.target.value },
                      }))}
                      className={`w-full px-4 py-2.5 bg-white border rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#02338D] ${errors[`question_${q.id}`] ? 'border-[#DC2626]' : 'border-[#E2E8F0]'}`}
                    >
                      <option value="">Select an option</option>
                      {(q.options || []).map((opt, idx) => (
                        <option key={`${q.id}-${idx}`} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={q.field_type === 'number' ? 'number' : q.field_type === 'email' ? 'email' : q.field_type === 'phone' ? 'tel' : q.field_type === 'date' ? 'date' : 'text'}
                      value={registrationData.answers[q.id] || ''}
                      onChange={(e) => setRegistrationData((prev) => ({
                        ...prev,
                        answers: { ...prev.answers, [q.id]: e.target.value },
                      }))}
                      className={`w-full px-4 py-2.5 bg-white border rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#02338D] ${errors[`question_${q.id}`] ? 'border-[#DC2626]' : 'border-[#E2E8F0]'}`}
                    />
                  )}
                  {errors[`question_${q.id}`] && (
                    <p className="mt-1.5 text-sm text-[#DC2626]">{errors[`question_${q.id}`]}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Additional Attendees */}
      {cart.quantity > 1 && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setShowAdditional(!showAdditional)}
            className="flex items-center gap-2 text-[#02338D] hover:underline"
          >
            <span>Additional Attendees ({cart.quantity - 1})</span>
            {showAdditional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdditional && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-6"
            >
              {additionalAttendees.map((attendee, index) => (
                <div key={index} className="p-4 bg-[#F8FAFC] rounded-xl space-y-4">
                  <p className="font-medium text-[#0F172A]">Attendee {index + 2}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CustomInput
                      label="First Name"
                      value={attendee.firstName}
                      onChange={(e) => handleAdditionalChange(index, 'firstName', e.target.value)}
                      error={errors[`additional_${index}_firstName`]}
                      required
                    />
                    <CustomInput
                      label="Last Name"
                      value={attendee.lastName}
                      onChange={(e) => handleAdditionalChange(index, 'lastName', e.target.value)}
                      error={errors[`additional_${index}_lastName`]}
                      required
                    />
                  </div>
                  <CustomInput
                    label="Email"
                    type="email"
                    value={attendee.email}
                    onChange={(e) => handleAdditionalChange(index, 'email', e.target.value)}
                    error={errors[`additional_${index}_email`]}
                    required
                  />
                </div>
              ))}
            </motion.div>
          )}
        </div>
      )}

      <CustomButton
        type="submit"
        variant="primary"
        fullWidth
        className="py-4"
        style={{ backgroundColor: themeColor }}
      >
        Continue to Payment
      </CustomButton>
    </motion.form>
  );
};

export default AttendeeForm;

