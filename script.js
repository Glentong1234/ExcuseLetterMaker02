const form = document.querySelector("#letterForm");
const draftStatus = document.querySelector("#draftStatus");
const letterPreview = document.querySelector("#letterPreview");
const printArea = document.querySelector("#printArea");
const wordCount = document.querySelector("#wordCount");
const toast = document.querySelector("#toast");

const saveDraftButton = document.querySelector("#saveDraftButton");
const clearFormButton = document.querySelector("#clearFormButton");
const copyButton = document.querySelector("#copyButton");
const printButton = document.querySelector("#printButton");
const downloadButton = document.querySelector("#downloadButton");
const loadSampleButton = document.querySelector("#loadSampleButton");

const reasonSelect = document.querySelector("#reason");
const otherReasonGroup = document.querySelector("#otherReasonGroup");
const otherReasonInput = document.querySelector("#otherReason");

const storageKey = "student_excuse_letter_generator_draft_v1";
let currentLetter = "";
let toastTimer = null;

const reasonLabels = {
  sickness: "sickness",
  medicalAppointment: "a medical appointment",
  familyEmergency: "a family emergency",
  importantFamilyMatter: "an important family matter",
  transportationProblem: "a transportation problem",
  badWeather: "bad weather",
  others: ""
};

const sampleData = {
  studentName: "Juan Dela Cruz",
  gradeSection: "Grade 10, Section A",
  schoolName: "Sample National High School",
  teacherName: "Ma'am Santos",
  letterDate: getTodayIsoDate(),
  absenceStart: getTodayIsoDate(),
  absenceEnd: "",
  reason: "sickness",
  otherReason: "",
  extraDetails: "I was advised to rest at home and recover before returning to class.",
  writerType: "parent",
  letterTone: "formal",
  includeCatchUp: true,
  guardianName: "Maria Dela Cruz",
  contactNumber: "09123456789"
};

function getTodayIsoDate() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().split("T")[0];
}

function formatDisplayDate(value) {
  if (!value) return "";

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function getFormData() {
  const data = new FormData(form);

  return {
    studentName: data.get("studentName").trim(),
    gradeSection: data.get("gradeSection").trim(),
    schoolName: data.get("schoolName").trim(),
    teacherName: data.get("teacherName").trim(),
    letterDate: data.get("letterDate"),
    absenceStart: data.get("absenceStart"),
    absenceEnd: data.get("absenceEnd"),
    reason: data.get("reason"),
    otherReason: data.get("otherReason").trim(),
    extraDetails: data.get("extraDetails").trim(),
    writerType: data.get("writerType"),
    letterTone: data.get("letterTone"),
    includeCatchUp: data.get("includeCatchUp") === "on",
    guardianName: data.get("guardianName").trim(),
    contactNumber: data.get("contactNumber").trim()
  };
}

function setFieldError(fieldName, message) {
  const field = form.elements[fieldName];
  const error = document.querySelector(`[data-error-for="${fieldName}"]`);

  if (field) {
    field.classList.toggle("is-invalid", Boolean(message));
    field.setAttribute("aria-invalid", Boolean(message).toString());
  }

  if (error) {
    error.textContent = message || "";
  }
}

function clearErrors() {
  ["studentName", "gradeSection", "teacherName", "letterDate", "absenceStart", "absenceEnd", "reason", "otherReason", "guardianName"].forEach((fieldName) => {
    setFieldError(fieldName, "");
  });
}

function validateFormData(data) {
  clearErrors();
  const errors = [];

  const requiredFields = [
    ["studentName", "Student name is required."],
    ["gradeSection", "Grade and section is required."],
    ["teacherName", "Teacher name is required."],
    ["letterDate", "Date today is required."],
    ["absenceStart", "Date of absence is required."],
    ["reason", "Reason for absence is required."],
    ["guardianName", "Parent or guardian name is required."]
  ];

  requiredFields.forEach(([fieldName, message]) => {
    if (!data[fieldName]) {
      errors.push([fieldName, message]);
      setFieldError(fieldName, message);
    }
  });

  if (data.reason === "others" && !data.otherReason) {
    errors.push(["otherReason", "Please enter the other reason."]);
    setFieldError("otherReason", "Please enter the other reason.");
  }

  if (data.absenceStart && data.absenceEnd) {
    const start = new Date(data.absenceStart);
    const end = new Date(data.absenceEnd);

    if (end < start) {
      errors.push(["absenceEnd", "End date cannot be earlier than the first absence date."]);
      setFieldError("absenceEnd", "End date cannot be earlier than the first absence date.");
    }
  }

  if (errors.length > 0) {
    const firstField = form.elements[errors[0][0]];
    if (firstField) firstField.focus();
  }

  return errors.length === 0;
}

function getAbsenceDateText(data) {
  const start = formatDisplayDate(data.absenceStart);
  const end = formatDisplayDate(data.absenceEnd);

  if (data.absenceEnd && data.absenceEnd !== data.absenceStart) {
    return `${start} to ${end}`;
  }

  return start;
}

function getReasonText(data) {
  if (data.reason === "others") return data.otherReason.toLowerCase();
  return reasonLabels[data.reason] || "";
}

function getDetailSentence(data) {
  if (!data.extraDetails) return "";

  const trimmed = data.extraDetails.replace(/\s+/g, " ").trim();
  const end = /[.!?]$/.test(trimmed) ? "" : ".";

  return ` ${trimmed}${end}`;
}

function getCatchUpSentence(data) {
  if (!data.includeCatchUp) return "";

  if (data.letterTone === "simple") {
    return "I will do my best to catch up with the lessons and activities I missed.";
  }

  if (data.writerType === "parent") {
    return "I will also guide my child in catching up with the missed lessons, activities, and requirements.";
  }

  return "I will make sure to catch up with the lessons, activities, and requirements I missed.";
}

function buildLetter(data) {
  const letterDate = formatDisplayDate(data.letterDate);
  const absenceText = getAbsenceDateText(data);
  const reasonText = getReasonText(data);
  const detailSentence = getDetailSentence(data);
  const catchUpSentence = getCatchUpSentence(data);
  const schoolLine = data.schoolName ? `\n${data.schoolName}` : "";
  const contactLine = data.contactNumber ? `\nContact number: ${data.contactNumber}` : "";

  if (data.writerType === "parent") {
    if (data.letterTone === "simple") {
      return `${letterDate}

Dear ${data.teacherName},

Good day.

I am writing to excuse my child, ${data.studentName} of ${data.gradeSection}, for being absent on ${absenceText} due to ${reasonText}.${detailSentence}

${catchUpSentence}

Thank you for your understanding.

Respectfully yours,

${data.guardianName}
Parent or guardian${contactLine}`;
    }

    if (data.letterTone === "respectful") {
      return `${letterDate}

Dear ${data.teacherName},

Good day.

I would like to respectfully request that my child, ${data.studentName} of ${data.gradeSection}, be excused for being absent on ${absenceText} due to ${reasonText}.${detailSentence}

I understand the value of regular attendance and the importance of classroom participation. ${catchUpSentence}

Thank you very much for your kind understanding and consideration.

Respectfully yours,

${data.guardianName}
Parent or guardian${contactLine}`;
    }

    return `${letterDate}

Dear ${data.teacherName},

Good day.

I am writing to respectfully excuse my child, ${data.studentName} of ${data.gradeSection}, for being absent on ${absenceText} due to ${reasonText}.${detailSentence}

I understand the importance of regular class attendance. ${catchUpSentence}

Thank you for your understanding and consideration.

Respectfully yours,

${data.guardianName}
Parent or guardian${contactLine}`;
  }

  if (data.letterTone === "simple") {
    return `${letterDate}

Dear ${data.teacherName},

Good day.

I would like to excuse myself for being absent on ${absenceText} due to ${reasonText}.${detailSentence}

${catchUpSentence}

Thank you for your understanding.

Respectfully yours,

${data.studentName}
${data.gradeSection}${schoolLine}

Noted by:

${data.guardianName}${contactLine}`;
  }

  if (data.letterTone === "respectful") {
    return `${letterDate}

Dear ${data.teacherName},

Good day.

I would like to respectfully request your consideration regarding my absence on ${absenceText} due to ${reasonText}.${detailSentence}

I understand that attending class regularly is important for my learning and academic responsibilities. ${catchUpSentence}

Thank you very much for your kind understanding and consideration.

Respectfully yours,

${data.studentName}
${data.gradeSection}${schoolLine}

Noted by:

${data.guardianName}${contactLine}`;
  }

  return `${letterDate}

Dear ${data.teacherName},

Good day.

I would like to respectfully excuse myself for being absent on ${absenceText} due to ${reasonText}.${detailSentence}

I understand the importance of attending classes regularly. ${catchUpSentence}

Thank you for your kind understanding and consideration.

Respectfully yours,

${data.studentName}
${data.gradeSection}${schoolLine}

Noted by:

${data.guardianName}${contactLine}`;
}

function renderLetter(letter) {
  currentLetter = letter;
  letterPreview.textContent = letter;
  printArea.textContent = letter;
  updateWordCount(letter);
  setPreviewButtons(true);
}

function updateWordCount(letter) {
  const words = letter.trim() ? letter.trim().split(/\s+/).length : 0;
  wordCount.textContent = `${words} words`;
}

function setPreviewButtons(isEnabled) {
  copyButton.disabled = !isEnabled;
  printButton.disabled = !isEnabled;
  downloadButton.disabled = !isEnabled;
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");

  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2600);
}

function saveDraft() {
  const data = getFormData();
  localStorage.setItem(storageKey, JSON.stringify(data));
  draftStatus.textContent = "Draft saved";
  showToast("Draft saved in this browser.");
}

function loadDraft() {
  const saved = localStorage.getItem(storageKey);

  if (!saved) {
    form.elements.letterDate.value = getTodayIsoDate();
    return;
  }

  try {
    const data = JSON.parse(saved);
    setFormValues(data);
    draftStatus.textContent = "Draft loaded";
  } catch {
    localStorage.removeItem(storageKey);
    form.elements.letterDate.value = getTodayIsoDate();
  }
}

function setFormValues(data) {
  Object.keys(data).forEach((key) => {
    const field = form.elements[key];

    if (!field) return;

    if (field.type === "checkbox") {
      field.checked = Boolean(data[key]);
      return;
    }

    field.value = data[key] || "";
  });

  updateOtherReasonVisibility();
}

function clearForm() {
  form.reset();
  form.elements.letterDate.value = getTodayIsoDate();
  localStorage.removeItem(storageKey);
  currentLetter = "";
  clearErrors();
  updateOtherReasonVisibility();
  letterPreview.innerHTML = '<p class="placeholder-text">Your generated letter will appear here after you complete the form and select Generate letter.</p>';
  printArea.textContent = "";
  updateWordCount("");
  setPreviewButtons(false);
  draftStatus.textContent = "Draft not saved";
  showToast("Form cleared.");
}

function updateOtherReasonVisibility() {
  const isOther = reasonSelect.value === "others";
  otherReasonGroup.classList.toggle("is-hidden", !isOther);
  otherReasonInput.required = isOther;

  if (!isOther) {
    otherReasonInput.value = "";
    setFieldError("otherReason", "");
  }
}

async function copyLetter() {
  if (!currentLetter) return;

  try {
    await navigator.clipboard.writeText(currentLetter);
    showToast("Letter copied to clipboard.");
  } catch {
    const helper = document.createElement("textarea");
    helper.value = currentLetter;
    document.body.appendChild(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
    showToast("Letter copied to clipboard.");
  }
}

function downloadLetter() {
  if (!currentLetter) return;

  const blob = new Blob([currentLetter], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "student-excuse-letter.txt";
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
  showToast("Text file downloaded.");
}

function loadSample() {
  setFormValues(sampleData);
  draftStatus.textContent = "Sample loaded";
  showToast("Sample details loaded.");
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = getFormData();

  if (!validateFormData(data)) {
    showToast("Please complete the required fields.");
    return;
  }

  const letter = buildLetter(data);
  renderLetter(letter);
  saveDraft();
  showToast("Letter generated.");
});

form.addEventListener("input", () => {
  draftStatus.textContent = "Draft has changes";
});

reasonSelect.addEventListener("change", updateOtherReasonVisibility);
saveDraftButton.addEventListener("click", saveDraft);
clearFormButton.addEventListener("click", clearForm);
copyButton.addEventListener("click", copyLetter);
printButton.addEventListener("click", () => window.print());
downloadButton.addEventListener("click", downloadLetter);
loadSampleButton.addEventListener("click", loadSample);

loadDraft();
updateOtherReasonVisibility();
setPreviewButtons(Boolean(currentLetter));
