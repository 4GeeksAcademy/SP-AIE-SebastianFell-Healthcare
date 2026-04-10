document.addEventListener("DOMContentLoaded", () => {
	const form = document.getElementById("patient-inquiry-form");
	if (!form) {
		return;
	}

	const lang = document.documentElement.lang === "es" ? "es" : "en";
	const messages = {
		es: {
			errors: {
				first_name: "El nombre debe contener solo letras y tener al menos 2 caracteres",
				last_name: "El apellido debe contener solo letras y tener al menos 2 caracteres",
				date_of_birth: "Ingresa una fecha de nacimiento válida. El paciente debe tener entre 0 y 120 años",
				email: "Ingresa un correo electrónico válido (ejemplo: nombre@proveedor.com)",
				phone: "El teléfono debe incluir un código de país (ejemplo: +1 305 555 0191)",
				preferred_language: "Selecciona tu idioma preferido",
				preferred_clinic: "Selecciona la clínica que te gustaría visitar",
				preferred_date: "Selecciona una fecha de al menos 1 día hábil desde hoy y no más de 60 días hacia adelante",
				preferred_time: "Selecciona tu franja horaria preferida",
				service_type: "Selecciona el tipo de atención que estás buscando",
				paediatric: "Paediatric Care está disponible para pacientes menores de 18 años. Revisa la fecha de nacimiento o selecciona un servicio diferente.",
				new_patient: "Indica si esta es tu primera visita a HealthCore",
				has_insurance: "Indica si tienes seguro médico",
				insurance_provider: "Ingresa el nombre de tu aseguradora",
				insurance_member_id: "El ID de afiliado debe tener entre 6 y 20 caracteres alfanuméricos",
				health_concern_base: "Describe tu consulta médica en al menos 20 caracteres (faltan {count} caracteres)",
				contact_consent: "Debes dar tu consentimiento para ser contactado antes de enviar este formulario",
				patient_id: "El Patient ID debe seguir el formato HC-A3F291"
			},
			warnings: {
				evening_combo: "La franja Evening (5pm-8pm) podría no estar disponible en esta clínica por su horario de cierre."
			}
		},
		en: {
			errors: {
				first_name: "First name must contain only letters and be at least 2 characters long",
				last_name: "Last name must contain only letters and be at least 2 characters long",
				date_of_birth: "Enter a valid date of birth. Patient age must be between 0 and 120",
				email: "Enter a valid email address (example: name@provider.com)",
				phone: "Phone number must include a country code (example: +1 305 555 0191)",
				preferred_language: "Select your preferred language",
				preferred_clinic: "Select the clinic you would like to visit",
				preferred_date: "Select a date at least 1 business day from today and no more than 60 days ahead",
				preferred_time: "Select your preferred time slot",
				service_type: "Select the type of care you are looking for",
				paediatric: "Paediatric Care is available for patients under 18 years old. Review the date of birth or choose a different service.",
				new_patient: "Please indicate whether this is your first visit to HealthCore",
				has_insurance: "Please indicate whether you have health insurance",
				insurance_provider: "Enter your insurance provider",
				insurance_member_id: "Member ID must be 6 to 20 alphanumeric characters",
				health_concern_base: "Describe your medical concern in at least 20 characters ({count} characters remaining)",
				contact_consent: "You must provide consent to be contacted before submitting this form",
				patient_id: "Patient ID must follow the format HC-A3F291"
			},
			warnings: {
				evening_combo: "Evening (5pm-8pm) availability may be limited at this clinic due to closing hours."
			}
		}
	};

	const dictionary = messages[lang];
	const clinicClosingHour = {
		"HealthCore Austin Central": 20,
		"HealthCore Austin North": 19,
		"HealthCore San Antonio": 18,
		"HealthCore Miami": 20,
		"HealthCore Orlando": 18,
		"HealthCore Atlanta": 19
	};

	const elements = {
		first_name: form.elements["first_name"],
		last_name: form.elements["last_name"],
		date_of_birth: form.elements["date_of_birth"],
		email: form.elements["email"],
		phone: form.elements["phone"],
		preferred_language: form.elements["preferred_language"],
		preferred_clinic: form.elements["preferred_clinic"],
		preferred_date: form.elements["preferred_date"],
		preferred_time: form.elements["preferred_time"],
		service_type: form.elements["service_type"],
		insurance_provider: form.elements["insurance_provider"],
		insurance_member_id: form.elements["insurance_member_id"],
		health_concern: form.elements["health_concern"],
		contact_consent: form.elements["contact_consent"],
		patient_id: form.elements["patient_id"],
		charCounter: document.getElementById("char-counter"),
		insuranceFields: document.getElementById("insurance-fields"),
		patientIdRow: document.getElementById("patient-id-row"),
		successMessage: document.getElementById("success-message")
	};

	const nameRegex = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,50}$/;
	const phoneRegex = /^\+[1-9]\d{0,3}(?:[\s-]?\d){6,14}$/;
	const memberIdRegex = /^[A-Za-z0-9]{6,20}$/;
	const patientIdRegex = /^HC-[A-Za-z0-9]{6}$/;

	initializeDateBounds();
	updateCharCounter();
	updateInsuranceVisibility();
	updatePatientIdVisibility();
	updateEveningWarning();

	form.addEventListener("submit", (event) => {
		event.preventDefault();
		const isValid = validateForm();
		if (!isValid) {
			return;
		}

		elements.successMessage.classList.remove("hidden");
		elements.successMessage.scrollIntoView({ behavior: "smooth", block: "start" });
		form.reset();
		clearAllErrors();
		clearWarning("evening_combo");
		updateCharCounter();
		updateInsuranceVisibility();
		updatePatientIdVisibility();
	});

	elements.health_concern.addEventListener("input", () => {
		updateCharCounter();
	});

	elements.preferred_time.addEventListener("change", updateEveningWarning);
	elements.preferred_clinic.addEventListener("change", updateEveningWarning);

	Array.from(form.elements["has_insurance"] || []).forEach((radio) => {
		radio.addEventListener("change", updateInsuranceVisibility);
	});

	Array.from(form.elements["new_patient"] || []).forEach((radio) => {
		radio.addEventListener("change", updatePatientIdVisibility);
	});

	function initializeDateBounds() {
		const minBusinessDate = getMinBusinessDate(new Date());
		const maxDate = addDays(stripTime(new Date()), 60);
		elements.preferred_date.min = toDateInputValue(minBusinessDate);
		elements.preferred_date.max = toDateInputValue(maxDate);
	}

	function validateForm() {
		clearAllErrors();
		let isValid = true;

		if (!nameRegex.test(elements.first_name.value.trim())) {
			setError("first_name", dictionary.errors.first_name);
			isValid = false;
		}

		if (!nameRegex.test(elements.last_name.value.trim())) {
			setError("last_name", dictionary.errors.last_name);
			isValid = false;
		}

		const dobDate = parseInputDate(elements.date_of_birth.value);
		const dobAge = dobDate ? calculateAge(dobDate, new Date()) : -1;
		if (!dobDate || dobAge < 0 || dobAge > 120) {
			setError("date_of_birth", dictionary.errors.date_of_birth);
			isValid = false;
		}

		if (!elements.email.validity.valid) {
			setError("email", dictionary.errors.email);
			isValid = false;
		}

		if (!phoneRegex.test(elements.phone.value.trim())) {
			setError("phone", dictionary.errors.phone);
			isValid = false;
		}

		if (!elements.preferred_language.value) {
			setError("preferred_language", dictionary.errors.preferred_language);
			isValid = false;
		}

		if (!elements.preferred_clinic.value) {
			setError("preferred_clinic", dictionary.errors.preferred_clinic);
			isValid = false;
		}

		const preferredDate = parseInputDate(elements.preferred_date.value);
		const minBusinessDate = getMinBusinessDate(new Date());
		const maxDate = addDays(stripTime(new Date()), 60);
		if (!preferredDate || preferredDate < minBusinessDate || preferredDate > maxDate) {
			setError("preferred_date", dictionary.errors.preferred_date);
			isValid = false;
		}

		if (!elements.preferred_time.value) {
			setError("preferred_time", dictionary.errors.preferred_time);
			isValid = false;
		}

		if (!elements.service_type.value) {
			setError("service_type", dictionary.errors.service_type);
			isValid = false;
		}

		if (elements.service_type.value === "Paediatric Care") {
			if (!dobDate || dobAge < 0 || dobAge >= 18) {
				setError("service_type", dictionary.errors.paediatric);
				isValid = false;
			}
		}

		const newPatientValue = getRadioValue("new_patient");
		if (!newPatientValue) {
			setError("new_patient", dictionary.errors.new_patient);
			isValid = false;
		}

		if (newPatientValue === "No") {
			const patientIdValue = elements.patient_id.value.trim();
			if (patientIdValue && !patientIdRegex.test(patientIdValue)) {
				setError("patient_id", dictionary.errors.patient_id);
				isValid = false;
			}
		}

		const hasInsuranceValue = getRadioValue("has_insurance");
		if (!hasInsuranceValue) {
			setError("has_insurance", dictionary.errors.has_insurance);
			isValid = false;
		}

		if (hasInsuranceValue === "Yes") {
			const provider = elements.insurance_provider.value.trim();
			const memberId = elements.insurance_member_id.value.trim();

			if (!provider) {
				setError("insurance_provider", dictionary.errors.insurance_provider);
				isValid = false;
			}

			if (!memberIdRegex.test(memberId)) {
				setError("insurance_member_id", dictionary.errors.insurance_member_id);
				isValid = false;
			}
		}

		const healthConcernValue = elements.health_concern.value.trim();
		if (healthConcernValue.length < 20 || healthConcernValue.length > 500) {
			const missingCount = Math.max(0, 20 - healthConcernValue.length);
			const message = dictionary.errors.health_concern_base.replace("{count}", String(missingCount));
			setError("health_concern", message);
			isValid = false;
		}

		if (!elements.contact_consent.checked) {
			setError("contact_consent", dictionary.errors.contact_consent);
			isValid = false;
		}

		updateEveningWarning();
		return isValid;
	}

	function updateCharCounter() {
		const length = elements.health_concern.value.length;
		elements.charCounter.textContent = `${length}/500`;
	}

	function updateInsuranceVisibility() {
		const hasInsurance = getRadioValue("has_insurance") === "Yes";
		elements.insuranceFields.classList.toggle("hidden", !hasInsurance);
		elements.insurance_provider.required = hasInsurance;
		elements.insurance_member_id.required = hasInsurance;
		if (!hasInsurance) {
			elements.insurance_provider.value = "";
			elements.insurance_member_id.value = "";
			clearError("insurance_provider");
			clearError("insurance_member_id");
		}
	}

	function updatePatientIdVisibility() {
		const isReturningPatient = getRadioValue("new_patient") === "No";
		elements.patientIdRow.classList.toggle("hidden", !isReturningPatient);
		if (!isReturningPatient) {
			elements.patient_id.value = "";
			clearError("patient_id");
		}
	}

	function updateEveningWarning() {
		clearWarning("evening_combo");
		if (elements.preferred_time.value !== "Evening (5pm–8pm)") {
			return;
		}

		const closingHour = clinicClosingHour[elements.preferred_clinic.value];
		if (typeof closingHour === "number" && closingHour < 20) {
			setWarning("evening_combo", dictionary.warnings.evening_combo);
		}
	}

	function getRadioValue(name) {
		const selected = form.querySelector(`input[name="${name}"]:checked`);
		return selected ? selected.value : "";
	}

	function parseInputDate(value) {
		if (!value) {
			return null;
		}
		const date = new Date(`${value}T00:00:00`);
		if (Number.isNaN(date.getTime())) {
			return null;
		}
		return stripTime(date);
	}

	function calculateAge(dob, today) {
		const current = stripTime(today);
		let age = current.getFullYear() - dob.getFullYear();
		const monthDifference = current.getMonth() - dob.getMonth();
		if (monthDifference < 0 || (monthDifference === 0 && current.getDate() < dob.getDate())) {
			age -= 1;
		}
		return age;
	}

	function getMinBusinessDate(baseDate) {
		let candidate = addDays(stripTime(baseDate), 1);
		while (isWeekend(candidate)) {
			candidate = addDays(candidate, 1);
		}
		return candidate;
	}

	function isWeekend(date) {
		const day = date.getDay();
		return day === 0 || day === 6;
	}

	function addDays(date, days) {
		const copy = new Date(date);
		copy.setDate(copy.getDate() + days);
		return stripTime(copy);
	}

	function stripTime(date) {
		return new Date(date.getFullYear(), date.getMonth(), date.getDate());
	}

	function toDateInputValue(date) {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	}

	function clearAllErrors() {
		const errorNodes = form.querySelectorAll(".field-error");
		errorNodes.forEach((node) => {
			node.textContent = "";
		});
	}

	function setError(name, message) {
		const node = form.querySelector(`[data-error-for="${name}"]`);
		if (node) {
			node.textContent = message;
		}
	}

	function clearError(name) {
		const node = form.querySelector(`[data-error-for="${name}"]`);
		if (node) {
			node.textContent = "";
		}
	}

	function setWarning(name, message) {
		const node = form.querySelector(`[data-warning-for="${name}"]`);
		if (node) {
			node.textContent = message;
		}
	}

	function clearWarning(name) {
		const node = form.querySelector(`[data-warning-for="${name}"]`);
		if (node) {
			node.textContent = "";
		}
	}
});
