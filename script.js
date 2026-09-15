// Import Firebase modules
import { database, ref, set, get, push, remove, update, child, auth, googleProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, ADMIN_EMAILS, STAFF_EMAILS } from './firebase-config.js';

// Authentication state
let currentUser = null;
let currentUserRole = null; // 'admin' or 'staff'

// Override native alert with beautiful custom toast
window.alert = function (message) {
    // Remove existing toast if any
    const existing = document.querySelector('.custom-toast');
    if (existing) existing.remove();

    // Determine type (success or error) based on emojis in message
    const isError = message.includes('❌') || message.includes('Error') || message.toLowerCase().includes('failed');

    // Clean up emojis from message for cleaner display
    const cleanMsg = message.replace('✅ ', '').replace('❌ ', '').replace('?', '').trim();

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `custom-toast ${isError ? 'error' : 'success'}`;

    // Add icon based on type
    const icon = isError ?
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>' :
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';

    toast.innerHTML = `${icon} <span>${cleanMsg}</span>`;
    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
};

// Detect if user is on mobile device
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        (window.innerWidth <= 768);
}

// Initialize students array
let students = [];

// DOM Elements
const admissionForm = document.getElementById('admissionForm');
const studentsList = document.getElementById('studentsList');
const certificateModal = document.getElementById('certificateModal');
const certificateContent = document.getElementById('certificateContent');
const bonafideModal = document.getElementById('bonafideModal');
const bonafideContent = document.getElementById('bonafideContent');
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');

// Load students from Firebase on page load
async function loadStudents() {
    try {
        const studentsRef = ref(database, 'students');
        const snapshot = await get(studentsRef);

        if (snapshot.exists()) {
            const data = snapshot.val();
            students = Object.keys(data).map(key => ({
                firebaseKey: key,
                ...data[key]
            }));
        } else {
            students = [];
        }
        window.studentsLoaded = true;
        displayStudents();
    } catch (error) {
        console.error('Error loading students:', error);
        window.studentsLoaded = true;
        alert('❌ Error loading students from database. Check console for details.');
    }
}

// Form submission handler
admissionForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = new FormData(admissionForm);
    const student = {
        id: Date.now(),
        studentPenId: formData.get('studentPenId'),
        registrationNo: formData.get('registrationNo'),
        studentName: formData.get('studentName'),
        fatherName: formData.get('fatherName'),
        lastName: formData.get('lastName'),
        motherName: formData.get('motherName'),
        dob: formData.get('dob'),
        gender: formData.get('gender'),
        birthPlace: formData.get('birthPlace'),
        birthTaluka: formData.get('birthTaluka'),
        birthDistrict: formData.get('birthDistrict'),
        aadharNo: formData.get('aadharNo'),
        religion: formData.get('religion'),
        caste: formData.get('caste'),
        subCaste: formData.get('subCaste'),
        class: formData.get('class'),
        section: formData.get('section'),
        admissionDate: formData.get('admissionDate'),
        previousSchool: formData.get('previousSchool'),
        nationality: formData.get('nationality'),
        motherTongue: formData.get('motherTongue'),
        progressInStudy: formData.get('progressInStudy'),
        behaviour: formData.get('behaviour'),
        dakhlaNo: formData.get('dakhlaNo'),
        reasonForLeaving: formData.get('reasonForLeaving'),
        address: formData.get('address'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        dateAdded: new Date().toISOString()
    };

    // Check if registration number already exists
    const existingStudent = students.find(s => s.registrationNo === student.registrationNo);
    if (existingStudent) {
        alert('❌ A student with this registration number already exists!');
        return;
    }

    // Save to Firebase
    try {
        const studentsRef = ref(database, 'students');
        const newStudentRef = push(studentsRef);
        await set(newStudentRef, student);

        // Show success message
        alert('✅ Student admission saved successfully!');

        // Reset form
        admissionForm.reset();

        // Reload students and switch to students tab
        await loadStudents();
        showTab('students');
    } catch (error) {
        console.error('Error saving student:', error);
        alert('❌ Error saving student to database. Check console for details.');
    }
});

// Form reset handler - auto-fill registration number after clearing
admissionForm.addEventListener('reset', function (e) {
    // Use setTimeout to ensure form is cleared before setting new value
    setTimeout(() => {
        setNextRegistrationNumber();
    }, 10);
});

// Tab switching
function showTab(tabName) {
    // Check if authentication is required
    if ((tabName === 'admission' || tabName === 'students') && !currentUserRole) {
        alert("Please login first to access this section.");
        return;
    }

    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from all buttons (if any)
    const tabBtns = document.querySelectorAll('.tab-btn');
    if (tabBtns && tabBtns.length) {
        tabBtns.forEach(btn => btn.classList.remove('active'));
    }

    // Show selected tab
    if (tabName === 'home') {
        const homeTab = document.getElementById('home-tab');
        if (homeTab) homeTab.classList.add('active');
        if (tabBtns && tabBtns[0]) tabBtns[0].classList.add('active');
    } else if (tabName === 'admission') {
        const admissionTab = document.getElementById('admission-tab');
        if (admissionTab) admissionTab.classList.add('active');
        if (tabBtns && tabBtns[1]) tabBtns[1].classList.add('active');
        // Auto-fill next registration number
        setNextRegistrationNumber();
    } else if (tabName === 'students') {
        const studentsTab = document.getElementById('students-tab');
        if (studentsTab) studentsTab.classList.add('active');
        if (tabBtns && tabBtns[2]) tabBtns[2].classList.add('active');
        displayStudents();
    }
}

// Auto-fill disabled as per user request
function setNextRegistrationNumber() {
    const regNoInput = document.getElementById('registrationNo');
    if (!regNoInput) return;
    regNoInput.removeAttribute('placeholder');
}

// Display all students
function displayStudents() {
    try {
        if (students.length === 0) {
            studentsList.innerHTML = `
            <div class="empty-state">
                <h3>No Students Enrolled Yet</h3>
                <p>Add students using the admission form</p>
            </div>
        `;
            return;
        }

        // Sort students by registration number in ascending order
        const sortedStudents = [...students].sort((a, b) => {
            const regA = (a.registrationNo || '').toString();
            const regB = (b.registrationNo || '').toString();

            // Try to parse as numbers first
            const numA = parseInt(regA);
            const numB = parseInt(regB);

            // If both are valid numbers, compare numerically
            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }

            // Otherwise, compare as strings
            return regA.localeCompare(regB, undefined, { numeric: true, sensitivity: 'base' });
        });

        studentsList.innerHTML = sortedStudents.map(student => `
        <div class="student-card" data-id="${student.id}">
            ${currentUserRole === 'admin' ? `
            <label class="student-checkbox-wrapper">
                <input type="checkbox" class="student-checkbox" value="${student.id}" onchange="updateBulkActionBtn()">
                <span class="custom-checkbox"></span>
            </label>
            ` : ''}
            <div class="student-info">
                <div class="info-item">
                    <span class="label">Registration No.</span>
                    <span class="value">${student.registrationNo}</span>
                </div>
                <div class="info-item">
                    <span class="label">Student Name</span>
                    <span class="value">${student.studentName}</span>
                </div>
                
                <!-- Hidden details wrapper -->
                <div id="extra-details-${student.id}" style="display: none; grid-column: 1 / -1; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; padding-top: 15px; margin-top: 5px; border-top: 1px dashed #93c5fd; width: 100%;">
                <div class="info-item">
                    <span class="label">Date of Birth</span>
                    <span class="value">${formatDate(student.dob)}</span>
                </div>
                <div class="info-item">
                    <span class="label">Student ID/PEN/APAAR</span>
                    <span class="value">${student.studentPenId || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="label">Dakhla No.</span>
                    <span class="value">${student.dakhlaNo || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="label">Gender</span>
                    <span class="value">${student.gender}</span>
                </div>
                <div class="info-item">
                    <span class="label">Birth Place</span>
                    <span class="value">${student.birthPlace}</span>
                </div>
                <div class="info-item">
                    <span class="label">Birth Taluka</span>
                    <span class="value">${student.birthTaluka}</span>
                </div>
                <div class="info-item">
                    <span class="label">Birth District</span>
                    <span class="value">${student.birthDistrict}</span>
                </div>
                <div class="info-item">
                    <span class="label">Aadhar No.</span>
                    <span class="value">${student.aadharNo}</span>
                </div>
                <div class="info-item">
                    <span class="label">Father's Name</span>
                    <span class="value">${student.fatherName}</span>
                </div>
                <div class="info-item">
                    <span class="label">Last Name</span>
                    <span class="value">${student.lastName || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="label">Mother's Name</span>
                    <span class="value">${student.motherName}</span>
                </div>
                <div class="info-item">
                    <span class="label">Religion</span>
                    <span class="value">${student.religion}</span>
                </div>
                <div class="info-item">
                    <span class="label">Caste</span>
                    <span class="value">${student.caste}</span>
                </div>
                <div class="info-item">
                    <span class="label">Sub Caste</span>
                    <span class="value">${student.subCaste}</span>
                </div>
                <div class="info-item">
                    <span class="label">Class</span>
                    <span class="value">${student.class} - ${student.section}</span>
                </div>
                <div class="info-item">
                    <span class="label">Admission Date</span>
                    <span class="value">${formatDate(student.admissionDate)}</span>
                </div>
                ${student.previousSchool ? `
                <div class="info-item">
                    <span class="label">Previous School</span>
                    <span class="value">${student.previousSchool}</span>
                </div>
                ` : ''}
                ${student.nationality ? `
                <div class="info-item">
                    <span class="label">Nationality</span>
                    <span class="value">${student.nationality}</span>
                </div>
                ` : ''}
                ${student.motherTongue ? `
                <div class="info-item">
                    <span class="label">Mother Tongue</span>
                    <span class="value">${student.motherTongue}</span>
                </div>
                ` : ''}
                ${student.progressInStudy ? `
                <div class="info-item">
                    <span class="label">Progress in Study</span>
                    <span class="value">${student.progressInStudy}</span>
                </div>
                ` : ''}
                ${student.behaviour ? `
                <div class="info-item">
                    <span class="label">Behaviour</span>
                    <span class="value">${student.behaviour}</span>
                </div>
                ` : ''}
                ${student.reasonForLeaving ? `
                <div class="info-item">
                    <span class="label">Reason for Leaving Previous School</span>
                    <span class="value">${student.reasonForLeaving}</span>
                </div>
                ` : ''}
                <div class="info-item">
                    <span class="label">Address</span>
                    <span class="value">${student.address}</span>
                </div>
                <div class="info-item">
                    <span class="label">Contact</span>
                    <span class="value">${student.phone}</span>
                </div>
                ${student.email ? `
                <div class="info-item">
                    <span class="label">Email</span>
                    <span class="value">${student.email}</span>
                </div>
                ` : ''}
                </div>
                <!-- End hidden details wrapper -->
            </div>
            <div class="student-actions">
                <button class="btn btn-secondary" onclick="toggleDetails('${student.id}')" id="toggle-btn-${student.id}" style="background: #64748b; color: white;">
                    <i class="fas fa-eye"></i> View
                </button>
                ${currentUserRole === 'admin' ? `
                <button class="btn btn-success" onclick="generateCertificate(${student.id})">
                    Generate LC
                </button>
                <button class="btn btn-info" onclick="generateBonafide(${student.id})" style="background: #17a2b8; color: white;">
                    Generate Bonafide
                </button>
                <button class="btn btn-primary" onclick="editStudent(${student.id})">
                    Edit
                </button>
                <button class="btn btn-danger" onclick="deleteStudent(${student.id})">
                    Delete
                </button>
                ` : ''}
            </div>
        </div>
    `).join('');

        // Reset "Select All" checkbox state when list renders
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
        updateBulkActionBtn();

        // Hide bulk action bar for staff
        const bulkActionBar = document.querySelector('.bulk-action-bar');
        if (bulkActionBar) {
            bulkActionBar.style.display = currentUserRole === 'admin' ? 'flex' : 'none';
        }
    } catch (err) {
        console.error("Display Students Error:", err);
        alert("Display Students Error: " + err.message + "\nLine: " + err.stack);
    }
}

// Toggle student details view
window.toggleDetails = function (studentId) {
    const detailsDiv = document.getElementById(`extra-details-${studentId}`);
    const toggleBtn = document.getElementById(`toggle-btn-${studentId}`);

    if (detailsDiv.style.display === 'none') {
        detailsDiv.style.display = 'grid';
        toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide';
        toggleBtn.style.background = '#475569';
    } else {
        detailsDiv.style.display = 'none';
        toggleBtn.innerHTML = '<i class="fas fa-eye"></i> View';
        toggleBtn.style.background = '#64748b';
    }
}

// Global Master Deletion Password
const MASTER_DELETE_PASSWORD = "SaravPath@99";

// Handle Bulk Selection
window.toggleSelectAll = function () {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const checkboxes = document.querySelectorAll('.student-checkbox');

    // Only select currently visible (filtered) checkboxes
    const visibleCards = Array.from(document.querySelectorAll('.student-card')).filter(card => card.style.display !== 'none');

    visibleCards.forEach(card => {
        const checkbox = card.querySelector('.student-checkbox');
        if (checkbox) checkbox.checked = selectAllCheckbox.checked;
    });

    updateBulkActionBtn();
}

window.updateBulkActionBtn = function () {
    const checkboxes = document.querySelectorAll('.student-checkbox:checked');
    const bulkBtn = document.getElementById('bulkDeleteBtn');
    const countSpan = document.getElementById('selectedCount');

    if (checkboxes.length > 0) {
        bulkBtn.style.display = 'inline-flex';
        countSpan.textContent = checkboxes.length;
    } else {
        bulkBtn.style.display = 'none';
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
    }
}

// Custom Promise-based Confirm & Prompt Modal
window.customConfirm = function (title, message, requirePassword = false) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customConfirmModal');
        const titleEl = document.getElementById('confirmTitle');
        const msgEl = document.getElementById('confirmMessage');
        const passContainer = document.getElementById('passwordInputContainer');
        const passInput = document.getElementById('confirmPassword');
        const okBtn = document.getElementById('confirmOkBtn');
        const cancelBtn = document.getElementById('confirmCancelBtn');

        titleEl.textContent = title;
        msgEl.textContent = message;

        if (requirePassword) {
            passContainer.style.display = 'block';
            passInput.value = '';
            setTimeout(() => passInput.focus(), 100);
        } else {
            passContainer.style.display = 'none';
        }

        modal.style.display = 'block';

        const cleanup = () => {
            modal.style.display = 'none';
            okBtn.onclick = null;
            cancelBtn.onclick = null;
            passInput.onkeydown = null;
        };

        const handleConfirm = () => {
            cleanup();
            if (requirePassword) {
                resolve(passInput.value);
            } else {
                resolve(true);
            }
        };

        okBtn.onclick = handleConfirm;

        cancelBtn.onclick = () => {
            cleanup();
            resolve(false);
        };

        passInput.onkeydown = (e) => {
            if (e.key === 'Enter') handleConfirm();
            if (e.key === 'Escape') cancelBtn.click();
        };
    });
}

// Bulk delete function
window.deleteSelectedStudents = async function () {
    const checkboxes = document.querySelectorAll('.student-checkbox:checked');
    if (checkboxes.length === 0) return;

    const count = checkboxes.length;

    const password = await customConfirm(
        'Bulk Delete',
        `Are you sure you want to permanently delete ${count} selected student(s)?`,
        true
    );

    if (password === false) return; // Cancelled

    if (password !== MASTER_DELETE_PASSWORD) {
        showToast('❌ Incorrect master password. Deletion cancelled.', 'error');
        return;
    }

    try {
        let deletedCount = 0;
        for (const checkbox of checkboxes) {
            const id = parseInt(checkbox.value);
            const studentToDelete = students.find(s => s.id === id);
            if (studentToDelete && studentToDelete.firebaseKey) {
                const studentRef = ref(database, `students/${studentToDelete.firebaseKey}`);
                await remove(studentRef);
                deletedCount++;
            }
        }

        showToast(`✅ Successfully deleted ${deletedCount} student(s)!`, 'success');
        await loadStudents();
    } catch (error) {
        console.error('Error during bulk deletion:', error);
        showToast('❌ Error deleting students. Check console for details.', 'error');
    }
}

// Search/Filter students
function filterStudents() {
    const searchTerm = document.getElementById('searchStudent').value.toLowerCase();
    const studentCards = document.querySelectorAll('.student-card');

    studentCards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            card.style.display = 'grid';
        } else {
            card.style.display = 'none';
        }
    });
}

// Export students to CSV
function exportToCSV() {
    if (students.length === 0) {
        alert('❌ No students to export!');
        return;
    }

    // Define CSV headers
    const headers = [
        'विद्यार्थी आयडी/पेन/आपार आयडी.',
        'रजिस्टर नं.',
        'विद्यार्थ्याचे नाव',
        'जन्मतारीख',
        'जन्मतारीख अक्षरी',
        'लिंग',
        'जन्मस्थळ',
        'तालुका',
        'जिल्हा',
        'आधार क्रमांक',
        'वडिलांचे नाव',
        'आईचे नाव',
        'धर्म',
        'जात',
        'पोटजात',
        'राष्ट्रीयत्व',
        'मातृभाषा',
        'वर्ग',
        'तुकडी',
        'दाखल तारीख',
        'मागील शाळेचे नाव',
        'अभ्यासातील प्रगती',
        'वर्तणूक',
        'दाखला क्र.',
        'मागील शाळा सोडण्याचे कारण',
        'पत्ता',
        'फोन नंबर',
        'ईमेल',
        'नोंदणीची तारीख'
    ];

    // Sort students by registration number in ascending order
    const sortedStudents = [...students].sort((a, b) => {
        const regA = (a.registrationNo || '').toString();
        const regB = (b.registrationNo || '').toString();

        // Try to parse as numbers first
        const numA = parseInt(regA);
        const numB = parseInt(regB);

        // If both are valid numbers, compare numerically
        if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
        }

        // Otherwise, compare as strings
        return regA.localeCompare(regB, undefined, { numeric: true, sensitivity: 'base' });
    });

    // Convert students data to CSV rows
    const csvRows = [];
    csvRows.push(headers.join(','));

    sortedStudents.forEach(student => {
        const row = [
            `"${student.studentPenId || ''}"`,
            `"${student.registrationNo || ''}"`,
            `"${student.studentName || ''}"`,
            `"${student.dob || ''}"`,
            `"${student.dob ? formatDateInWords(student.dob) : ''}"`,
            `"${student.gender || ''}"`,
            `"${student.birthPlace || ''}"`,
            `"${student.birthTaluka || ''}"`,
            `"${student.birthDistrict || ''}"`,
            `"${student.aadharNo || ''}"`,
            `"${student.fatherName || ''}"`,
            `"${student.motherName || ''}"`,
            `"${student.religion || ''}"`,
            `"${student.caste || ''}"`,
            `"${student.subCaste || ''}"`,
            `"${student.nationality || ''}"`,
            `"${student.motherTongue || ''}"`,
            `"${student.class || ''}"`,
            `"${student.section || ''}"`,
            `"${student.admissionDate || ''}"`,
            `"${student.previousSchool || ''}"`,
            `"${student.progressInStudy || ''}"`,
            `"${student.behaviour || ''}"`,
            `"${student.dakhlaNo || ''}"`,
            `"${student.reasonForLeaving || ''}"`,
            `"${student.address || ''}"`,
            `"${student.phone || ''}"`,
            `"${student.email || ''}"`,
            `"${student.dateAdded || ''}"`
        ];
        csvRows.push(row.join(','));
    });

    // Create CSV string
    const csvContent = csvRows.join('\n');

    // Create blob and download (with UTF-8 BOM for Excel compatibility)
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const today = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `students_export_${today}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert(`✅ Successfully exported ${students.length} students to CSV!`);
}

// Mobile nav toggle
function toggleNav() {
    const nav = document.querySelector('.main-nav');
    nav.classList.toggle('open');
}

// Close mobile nav when clicking outside
window.addEventListener('click', function (e) {
    const nav = document.querySelector('.main-nav');
    if (!nav) return;
    if (!nav.contains(e.target) && nav.classList.contains('open')) {
        nav.classList.remove('open');
    }
});

// Delete student
async function deleteStudent(id) {
    const password = await customConfirm(
        'Delete Student',
        'Are you sure you want to permanently delete this student record? This action cannot be undone.',
        true
    );

    if (password === false) return; // Cancelled

    if (password !== MASTER_DELETE_PASSWORD) {
        showToast('❌ Incorrect master password. Deletion cancelled.', 'error');
        return;
    }

    try {
        const studentToDelete = students.find(s => s.id === id);
        if (studentToDelete && studentToDelete.firebaseKey) {
            const studentRef = ref(database, `students/${studentToDelete.firebaseKey}`);
            await remove(studentRef);
            showToast('✅ Student deleted successfully!', 'success');
            await loadStudents();
        } else {
            showToast('❌ Error: Student not found!', 'error');
        }
    } catch (error) {
        console.error('Error deleting student:', error);
        showToast('❌ Error deleting student from database. Check console for details.', 'error');
    }
}

// Generate leaving certificate
function generateCertificate(id) {
    const student = students.find(s => s.id === id);
    if (!student) {
        alert('❌ Student not found!');
        return;
    }

    // Calculate age
    const age = calculateAge(student.dob);
    const admissionYear = new Date(student.admissionDate).getFullYear();
    const currentYear = new Date().getFullYear();

    const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
    const certificate = `
        <div class="certificate" style="padding: 20px; font-family: 'Noto Sans Devanagari', Arial, sans-serif; max-width: 100%; margin: 0 auto; box-sizing: border-box;">
            <div class="certificate-header">
                <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px;">
                    <img src="${baseUrl}images/logo.png" alt="School Logo" style="max-height: 90px; max-width: 90px;">
                    <div style="text-align: center; flex: 1; margin: 0 15px;">
                        <p style="color: #8B0000; font-size: 13px; margin: 2px 0; font-weight: 600;">
                            महात्मा गांधी विद्यामंदिर शिक्षण संस्था,
                        </p>
                        <h1 style="color: #8B0000; font-size: 20px; margin: 3px 0; font-weight: 700;">
                            मराठी अध्यापक विद्यालय संलग्नित सरावपाठ शाळा
                        </h1>
                        <p style="color: #8B0000; font-size: 12px; margin: 2px 0;">
                            भायगांव रोड, मालेगांव कॅम्प, ता. मालेगांव जि. नाशिक
                        </p>
                        <p style="color: #8B0000; font-size: 10px; margin: 2px 0; text-align: left;">
                            शाळा मान्यता क्रमांक -
                        </p>
                        <p style="color: #8B0000; font-size: 11px; margin: 3px 0; text-align: left; border-bottom: 2px solid #8B0000; padding-bottom: 3px;">
                            फोन नं.- <span style="margin-left: 150px;">ई-मेल - marathiadhya.sarav@gmail.com</span>
                        </p>
                        <div style="text-align: left; font-size: 13px; margin: 2px 0; line-height: 1.4;">
                            <div style="color: #8B0000;">● माध्यम - मराठी ● बोर्ड - नाशिक ● संलग्रता क्रमांक - <span style="margin-left: 140px;">● यु. डायस क्र.- 27201700209</span></div>
                            <div style="color: #000000;">दाखला क्र.- <strong>${student.dakhlaNo || ''}</strong> <span style="margin-left: 330px;">जनरल रजि.क्र.- <strong>${student.registrationNo || ''}</strong></span></div>
                        </div>
                    </div>
                    <img src="${baseUrl}images/Karmaveer bhausaheb hiray.jpg" alt="Founder" style="max-height: 90px; max-width: 90px; border-radius: 5px;">
                </div>
                
                <div style="text-align: center; margin: 15px 0; position: relative;">
                    <div style="border-top: 3px solid #000; position: absolute; width: 100%; top: 50%; z-index: 1;"></div>
                    <h2 style="background: white; display: inline-block; padding: 8px 30px; position: relative; z-index: 2; color: white; background-color: #8B0000; font-size: 26px; margin: 0; border-radius: 25px; font-weight: 700;">शाळा सोडल्याचा दाखला</h2>
                </div>
            </div>
            
            <div class="certificate-body" style="font-size: 13px; line-height: 1.8;">
                <p style="margin: 10px 0; border-bottom: 2px solid #000000; padding-bottom: 5px;">विद्यार्थी आयडी/पेन/आपार आयडी. - <strong>${student.studentPenId || ''}</strong> <span style="margin-left: 150px;">यु.आय.डी.नं. (आधार कार्ड क्रमांक) - <strong>${student.aadharNo}</strong></span></p>
                
                <p style="margin: 8px 0;">१) विद्यार्थीचे संपूर्ण नाव - <strong>${student.studentName}</strong> <span style="margin-left: 40px;">(वडीलांचे नाव) <strong>${student.fatherName}</strong></span> <span style="margin-left: 40px;">(आडनाव) <strong>${student.lastName || ''}</strong></span></p>
                
                <p style="margin: 8px 0;">२) आईचे नाव - <strong>${student.motherName}</strong></p>
                
                <p style="margin: 8px 0;">३) राष्ट्रीयत्व : भारतीय <span style="margin-left: 120px;">४) मातृभाषा : मराठी</span></p>
                
                <p style="margin: 8px 0;">५) धर्म : <strong>${student.religion}</strong> <span style="margin-left: 40px;">६) जात : <strong>${student.caste}</strong></span> <span style="margin-left: 40px;">७) पोटजात : <strong>${student.subCaste}</strong></span></p>
                
                <p style="margin: 8px 0;">८) जन्मस्थळ (गाव / शहर) : <strong>${student.birthPlace}</strong> <span style="margin-left: 40px;">तालुका : <strong>${student.birthTaluka}</strong></span> <span style="margin-left: 40px;">जिल्हा : <strong>${student.birthDistrict}</strong></span></p>
                
                <p style="margin: 8px 0;">९) राज्य : महाराष्ट्र <span style="margin-left: 120px;">१०) देश : भारत</span></p>
                
                <p style="margin: 8px 0;">११) जन्म दिनांक अंकी - <strong>${formatDate(student.dob)}</strong></p>
                
                <p style="margin: 8px 0;">१२) जन्म दिनांक अक्षरी - <strong>${formatDateInWords(student.dob)}</strong></p>
                
                <p style="margin: 8px 0;">१३) या पूर्वी शिकून आलेल्या शाळेचे नाव - <strong>${student.previousSchool || 'लागू नाही'}</strong></p>
                
                <p style="margin:8px 0;">१४) या शाळेत प्रवेश घेतल्याचा दिनांक - <strong>${formatDate(student.admissionDate)}</strong> <span style="margin-left: 60px;">१५) इयता - <strong>${student.class}</strong></span></p>
                
                <p style="margin: 8px 0;">१६) अभ्यासात प्रगती - <strong>${student.progressInStudy || ''}</strong> <span style="margin-left: 60px;">१७) वर्तणूक - <strong>${student.behaviour || ''}</strong></span></p>
                
                <p style="margin: 8px 0;">१८) शाळा सोडल्याचा दिनांक - <strong>${formatDate(new Date().toISOString().split('T')[0])}</strong></p>
                
                <p style="margin: 8px 0;">१९) कोणत्या इयतत शिकत होता व केव्हापासून  - <strong>${student.class}</strong></p>
                
                <p style="margin: 8px 0;">२०) शाळा सोडल्याचे कारण - <strong>पालकांच्या विनंतीनुसार</strong></p>
                
                <p style="margin: 8px 0;">२१) शेरा - <strong></strong></p>
                
                <p style="margin: 20px 0 10px 0; font-size: 12px;">दाखला देण्यात येतो की, वरील माहिती शाळेतील जनरल रजिष्टर नं. १ प्रमाणे आहे.</p>
                
                <p style="margin: 5px 0; font-size: 11px;">दाखला देण्याची तारीख - <strong>${formatDate(new Date().toISOString().split('T')[0])}</strong></p>
            </div>
            
            <div class="certificate-footer" style="display: flex; justify-content: space-between; margin-top: 40px; border-top: 1px solid #000; padding-top: 20px;">
                <div style="text-align: center;">
                    <div style="margin-bottom: 50px;"></div>
                    <div style="font-weight: bold;">लिपीक/ता.क</div>
                </div>
                <div style="text-align: center;">
                    <div style="margin-bottom: 50px;"></div>
                    <div style="font-weight: bold;">मुख्याध्यापक/प्राचार्य</div>
                </div>
            </div>
            <p style="font-size: 10px; margin-top: 10px; text-align: center;">टिप :- १) शाळा सोडल्याचे दाखल्यामध्ये अनाधिकृतरित्या बदल केल्यास संबंधितांवर कायदेशिर कारवाई करण्यात येईल.</p>
        </div>
    `;

    certificateContent.innerHTML = certificate;
    certificateModal.style.display = 'block';
}

// Generate Bonafide Certificate
function generateBonafide(id) {
    const student = students.find(s => s.id === id);
    if (!student) {
        alert('❌ Student not found!');
        return;
    }

    const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
    const bonafide = `
        <div class="bonafide-certificate" style="padding: 20px; font-family: 'Noto Sans Devanagari', Arial, sans-serif; max-width: 100%; margin: 0 auto; box-sizing: border-box; min-height: 297mm; position: relative;">
            
            <div class="bonafide-header">
                <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px;">
                    <img src="${baseUrl}images/logo.png" alt="School Logo" style="max-height: 90px; max-width: 90px;">
                    <div style="text-align: center; flex: 1; margin: 0 15px;">
                        <p style="color: #8B0000; font-size: 15px; margin: 2px 0; font-weight: 600;">
                            महात्मा गांधी विद्यामंदिर शिक्षण संस्था,
                        </p>
                        <h1 style="color: #8B0000; font-size: 24px; margin: 5px 0; font-weight: 700;">
                            मराठी अध्यापक विद्यालय संलग्नित सरावपाठ शाळा
                        </h1>
                        <p style="color: #8B0000; font-size: 14px; margin: 5px 0;">
                            भायगांव रोड, मालेगांव कॅम्प, ता. मालेगांव जि. नाशिक
                        </p>
                    </div>
                    <img src="${baseUrl}images/Karmaveer bhausaheb hiray.jpg" alt="Founder" style="max-height: 90px; max-width: 90px; border-radius: 5px;">
                </div>
                <div style="border-bottom: 2px solid #8B0000; margin-bottom: 10px;"></div>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 16px; font-weight: 600;">
                    <div>जा.क्र.:- समक्ष /${new Date().getFullYear()}/${new Date().getFullYear() + 1}</div>
                    <div>दिनांक.: <span style="color: red;">${formatDate(new Date().toISOString().split('T')[0])}</span></div>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <h2 style="font-size: 28px; margin: 0; font-weight: 700;">----: बोनाफाईड सर्टिफिकेट :----</h2>
                </div>
            </div>
            
            <div class="bonafide-body" style="font-size: 18px; line-height: 2; margin-top: 40px; padding: 0 20px; position: relative; z-index: 2;">
                <p style="text-indent: 50px; text-align: justify; margin-bottom: 30px;">
                    दाखला देण्यात येतो की, <span style="color: red; font-weight: bold;">कु. ${student.studentName}</span> हा / ही आमच्या अध्यापक विद्यालय संलग्न सराव पाठशाळेत शिकत असून त्याची / तिची शालेय अभिलेखानुसार माहिती खालील प्रमाणे.
                </p>
                
                <div style="margin-left: 20px; font-weight: 600;">
                    <div style="display: grid; grid-template-columns: 150px 30px 1fr; margin-bottom: 15px;">
                        <div>र.नं.</div><div>:-</div><div>${student.registrationNo || ''}</div>
                    </div>
                    <div style="display: grid; grid-template-columns: 150px 30px 1fr; margin-bottom: 15px;">
                        <div>नाव</div><div>:-</div><div style="color: red;">कु. ${student.studentName}</div>
                    </div>
                    <div style="display: grid; grid-template-columns: 150px 30px 1fr; margin-bottom: 15px;">
                        <div>जन्मतारीख</div><div>:-</div><div>${formatDate(student.dob)}</div>
                    </div>
                    <div style="display: grid; grid-template-columns: 150px 30px 1fr; margin-bottom: 15px;">
                        <div>जात</div><div>:-</div><div>${student.caste}${student.subCaste ? '-' + student.subCaste : ''}</div>
                    </div>
                    <div style="display: grid; grid-template-columns: 150px 30px 1fr; margin-bottom: 30px;">
                        <div>वर्ग</div><div>:-</div><div>${student.class}</div>
                    </div>
                </div>
                
                <p style="margin-top: 30px; font-weight: 600; text-align: justify;">
                    वरील प्रमाणे माहिती बरोबर आहे सदर चा दाखला शिष्यवृत्ती व बँकेच्या / वसतीगृह प्रवेशासाठी / जातीच्या दाखल्यासाठी / रेशनकार्डसाठी दिला असे.
                </p>
                
                <div style="margin-top: 60px; font-weight: 600;">
                    <div style="display: grid; grid-template-columns: 80px 30px 1fr; margin-bottom: 15px;">
                        <div>स्थळ</div><div>:-</div><div>मालेगाव कॅम्प.</div>
                    </div>
                    <div style="display: grid; grid-template-columns: 80px 30px 1fr; margin-bottom: 15px;">
                        <div>दिनांक</div><div>:-</div><div style="color: red;">${formatDate(new Date().toISOString().split('T')[0])}</div>
                    </div>
                </div>
            </div>
            
            <div class="bonafide-footer" style="display: flex; justify-content: space-between; margin-top: 80px; padding: 0 40px; position: relative; z-index: 2;">
                <div style="text-align: center;">
                    <div style="margin-bottom: 50px;"></div>
                    <div style="font-weight: bold; font-size: 18px;">लिपीक/ता.क</div>
                </div>
                <div style="text-align: center;">
                    <div style="margin-bottom: 50px;"></div>
                    <div style="font-weight: bold; font-size: 18px;">मुख्याध्यापक/प्राचार्य</div>
                </div>
            </div>
        </div>
    `;

    bonafideContent.innerHTML = bonafide;
    bonafideModal.style.display = 'block';
}

// Format date in words (Marathi)
function formatDateInWords(dateStr) {
    const days = ['', 'एक', 'दोन', 'तीन', 'चार', 'पाच', 'सहा', 'सात', 'आठ', 'नऊ', 'दहा',
        'अकरा', 'बारा', 'तेरा', 'चौदा', 'पंधरा', 'सोळा', 'सतरा', 'अठरा', 'एकोणीस', 'वीस',
        'एकवीस', 'बावीस', 'तेवीस', 'चोवीस', 'पंचवीस', 'सव्वीस', 'सत्तावीस', 'अठ्ठावीस', 'एकोणतीस', 'तीस', 'एकतीस'];

    const ones = ['', 'एक', 'दोन', 'तीन', 'चार', 'पाच', 'सहा', 'सात', 'आठ', 'नऊ'];
    const teens = ['दहा', 'अकरा', 'बारा', 'तेरा', 'चौदा', 'पंधरा', 'सोळा', 'सतरा', 'अठरा', 'एकोणीस'];
    const twenties = ['वीस', 'एकवीस', 'बावीस', 'तेवीस', 'चोवीस', 'पंचवीस', 'सव्वीस', 'सत्तावीस', 'अठ्ठावीस', 'एकोणतीस'];
    const thirties = ['तीस', 'एकतीस', 'बत्तीस', 'तेहतीस', 'चौतीस', 'पस्तीस', 'छत्तीस', 'सदतीस', 'अडतीस', 'एकोणचाळीस'];
    const fourties = ['चाळीस', 'एकेचाळीस', 'बेचाळीस', 'त्रेचाळीस', 'चव्वेचाळीस', 'पंचेचाळीस', 'सेहेचाळीस', 'सत्तेचाळीस', 'अठ्ठेचाळीस', 'एकोणपन्नास'];
    const fifties = ['पन्नास', 'एक्कावन्न', 'बावन्न', 'त्रेपन्न', 'चोपन्न', 'पंचावन्न', 'छपन्न', 'सत्तावन्न', 'अठ्ठावन्न', 'एकोणसाठ'];
    const sixties = ['साठ', 'एकसष्ठ', 'बासष्ठ', 'त्रेसष्ठ', 'चौसष्ठ', 'पासष्ठ', 'सहासष्ठ', 'सदुसष्ठ', 'अडुसष्ठ', 'एकोणसत्तर'];
    const seventies = ['सत्तर', 'एकाहत्तर', 'बाहत्तर', 'त्र्याहत्तर', 'चौऱ्याहत्तर', 'पंच्याहत्तर', 'शहात्तर', 'सत्याहत्तर', 'अठ्ठ्याहत्तर', 'एकोणऐंशी'];
    const eighties = ['ऐंशी', 'एक्याऐंशी', 'ब्याऐंशी', 'त्र्याऐंशी', 'चौऱ्याऐंशी', 'पंच्याऐंशी', 'शहाऐंशी', 'सत्याऐंशी', 'अठ्ठ्याऐंशी', 'एकोणनव्वद'];
    const nineties = ['नव्वद', 'एक्याण्णव', 'ब्याण्णव', 'त्र्याण्णव', 'चौऱ्याण्णव', 'पंच्याण्णव', 'शहाण्णव', 'सत्याण्णव', 'अठ्ठ्याण्णव', 'नव्व्याण्णव'];

    const months = ['जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून', 'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'];

    const date = new Date(dateStr);
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    // Get day in words (1-31)
    const dayInWords = days[day];

    // Convert year to words
    function numberToWords(num) {
        if (num === 0) return '';
        if (num < 10) return ones[num];
        if (num >= 10 && num < 20) return teens[num - 10];
        if (num >= 20 && num < 30) return twenties[num - 20];
        if (num >= 30 && num < 40) return thirties[num - 30];
        if (num >= 40 && num < 50) return fourties[num - 40];
        if (num >= 50 && num < 60) return fifties[num - 50];
        if (num >= 60 && num < 70) return sixties[num - 60];
        if (num >= 70 && num < 80) return seventies[num - 70];
        if (num >= 80 && num < 90) return eighties[num - 80];
        if (num >= 90 && num < 100) return nineties[num - 90];
        return '';
    }

    let yearInWords = '';
    const thousands = Math.floor(year / 1000);
    const hundreds = Math.floor((year % 1000) / 100);
    const remainder = year % 100;

    if (thousands > 0) {
        yearInWords = numberToWords(thousands) + ' हजार';
    }
    if (hundreds > 0) {
        yearInWords += (yearInWords ? ' ' : '') + numberToWords(hundreds) + ' शे';
    }
    if (remainder > 0) {
        yearInWords += (yearInWords ? ' ' : '') + numberToWords(remainder);
    }

    return `${dayInWords} ${month} ${yearInWords}`;
}

// Calculate age from date of birth
function calculateAge(dob) {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
}

// Format date to DD/MM/YYYY
function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Close modals
function closeModal() {
    certificateModal.style.display = 'none';
}

function closeBonafideModal() {
    bonafideModal.style.display = 'none';
}

// Print certificate - generates PDF directly using html2canvas + jsPDF
// No browser print dialog needed — works on all devices including mobile
async function printCertificate() {
    const certEl = document.querySelector('#certificateContent .certificate');
    if (!certEl) {
        alert('Certificate not found. Please try again.');
        return;
    }

    // Show loading state on button
    const btn = document.querySelector('#certificateModal .btn-primary');
    const originalText = btn ? btn.textContent : '';
    if (btn) {
        btn.textContent = '⏳ Generating PDF...';
        btn.disabled = true;
    }

    try {
        // Capture the certificate element as a canvas image
        const canvas = await html2canvas(certEl, {
            scale: 2,           // 2x resolution for crisp text
            useCORS: true,      // allow cross-origin images (logos)
            allowTaint: false,
            backgroundColor: '#FFFBF5',
            logging: false,
            imageTimeout: 5000,
            onclone: function (clonedDoc) {
                // Ensure the cloned certificate is fully visible
                const clonedCert = clonedDoc.querySelector('.certificate');
                if (clonedCert) {
                    clonedCert.style.overflow = 'visible';
                    clonedCert.style.maxWidth = 'none';
                }
            }
        });

        // Create A4 PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();   // 210mm
        const pageHeight = pdf.internal.pageSize.getHeight();  // 297mm

        // Scale the captured image to fill the full A4 page width
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const imgWidthPx = canvas.width;
        const imgHeightPx = canvas.height;
        const ratio = pageWidth / imgWidthPx;
        const imgHeightMm = imgHeightPx * ratio;

        // If certificate fits on one page, center it; otherwise let it fill
        const yOffset = imgHeightMm < pageHeight
            ? (pageHeight - imgHeightMm) / 2   // vertically centered
            : 0;

        pdf.addImage(imgData, 'JPEG', 0, yOffset, pageWidth, imgHeightMm);

        // Trigger download
        pdf.save('ShalaaSodlyachaDakhla.pdf');

    } catch (err) {
        console.error('PDF generation error:', err);
        alert('PDF generation failed. Please try again.');
    } finally {
        // Restore button
        if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }
}

// Print Bonafide Certificate - generates PDF directly using html2canvas + jsPDF
async function printBonafide() {
    const certEl = document.querySelector('#bonafideContent .bonafide-certificate');
    if (!certEl) {
        alert('Certificate not found. Please try again.');
        return;
    }

    const btn = document.querySelector('#bonafideModal .btn-primary');
    const originalText = btn ? btn.textContent : '';
    if (btn) {
        btn.textContent = '⏳ Generating PDF...';
        btn.disabled = true;
    }

    try {
        const canvas = await html2canvas(certEl, {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            backgroundColor: '#ffffff',
            logging: false,
            imageTimeout: 5000,
            onclone: function (clonedDoc) {
                const clonedCert = clonedDoc.querySelector('.bonafide-certificate');
                if (clonedCert) {
                    clonedCert.style.overflow = 'visible';
                    clonedCert.style.maxWidth = 'none';
                }
            }
        });

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const imgWidthPx = canvas.width;
        const imgHeightPx = canvas.height;
        const ratio = pageWidth / imgWidthPx;
        const imgHeightMm = imgHeightPx * ratio;

        const yOffset = imgHeightMm < pageHeight
            ? (pageHeight - imgHeightMm) / 2
            : 0;

        pdf.addImage(imgData, 'JPEG', 0, yOffset, pageWidth, imgHeightMm);
        pdf.save('Bonafide_Certificate.pdf');

    } catch (err) {
        console.error('PDF generation error:', err);
        alert('PDF generation failed. Please try again.');
    } finally {
        if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }
}

// Close modal when clicking outside
window.onclick = function (event) {
    if (event.target === certificateModal) {
        closeModal();
    }
    if (event.target === bonafideModal) {
        closeBonafideModal();
    }
    if (event.target === document.getElementById('editModal')) {
        closeEditModal();
    }
}

// Edit student functionality
function editStudent(id) {
    const student = students.find(s => s.id === id);
    if (!student) {
        alert('❌ Student not found!');
        return;
    }

    // Populate edit form
    document.getElementById('editStudentId').value = student.id;
    document.getElementById('editStudentPenId').value = student.studentPenId || '';
    document.getElementById('editRegistrationNo').value = student.registrationNo;
    document.getElementById('editStudentName').value = student.studentName;
    document.getElementById('editFatherName').value = student.fatherName;
    document.getElementById('editLastName').value = student.lastName || '';
    document.getElementById('editMotherName').value = student.motherName;
    document.getElementById('editDob').value = student.dob;
    document.getElementById('editGender').value = student.gender;
    document.getElementById('editDakhlaNo').value = student.dakhlaNo || '';
    document.getElementById('editBirthPlace').value = student.birthPlace;
    document.getElementById('editBirthTaluka').value = student.birthTaluka;
    document.getElementById('editBirthDistrict').value = student.birthDistrict;
    document.getElementById('editAadharNo').value = student.aadharNo;
    document.getElementById('editReligion').value = student.religion;
    document.getElementById('editCaste').value = student.caste;
    document.getElementById('editSubCaste').value = student.subCaste;
    document.getElementById('editClass').value = student.class;
    document.getElementById('editSection').value = student.section;
    document.getElementById('editAdmissionDate').value = student.admissionDate;
    document.getElementById('editPreviousSchool').value = student.previousSchool || '';
    document.getElementById('editNationality').value = student.nationality || '';
    document.getElementById('editMotherTongue').value = student.motherTongue || '';
    document.getElementById('editProgressInStudy').value = student.progressInStudy || '';
    document.getElementById('editBehaviour').value = student.behaviour || '';
    document.getElementById('editReasonForLeaving').value = student.reasonForLeaving || '';
    document.getElementById('editAddress').value = student.address;
    document.getElementById('editPhone').value = student.phone;
    document.getElementById('editEmail').value = student.email || '';

    // Show edit modal
    editModal.style.display = 'block';
}

function closeEditModal() {
    editModal.style.display = 'none';
}

// Handle edit form submission
editForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = new FormData(editForm);
    const studentId = parseInt(document.getElementById('editStudentId').value);
    const registrationNo = formData.get('registrationNo');

    // Check if registration number is taken by another student
    const existingStudent = students.find(s => s.registrationNo === registrationNo && s.id !== studentId);
    if (existingStudent) {
        alert('❌ This registration number is already taken by another student!');
        return;
    }

    // Find student
    const studentData = students.find(s => s.id === studentId);
    if (!studentData) {
        alert('❌ Student not found!');
        return;
    }

    // Update student data
    const updatedStudent = {
        id: studentData.id,
        studentPenId: formData.get('studentPenId'),
        registrationNo: formData.get('registrationNo'),
        studentName: formData.get('studentName'),
        fatherName: formData.get('fatherName'),
        lastName: formData.get('lastName'),
        motherName: formData.get('motherName'),
        dob: formData.get('dob'),
        gender: formData.get('gender'),
        birthPlace: formData.get('birthPlace'),
        birthTaluka: formData.get('birthTaluka'),
        birthDistrict: formData.get('birthDistrict'),
        aadharNo: formData.get('aadharNo'),
        religion: formData.get('religion'),
        caste: formData.get('caste'),
        subCaste: formData.get('subCaste'),
        class: formData.get('class'),
        section: formData.get('section'),
        admissionDate: formData.get('admissionDate'),
        previousSchool: formData.get('previousSchool'),
        nationality: formData.get('nationality'),
        motherTongue: formData.get('motherTongue'),
        progressInStudy: formData.get('progressInStudy'),
        behaviour: formData.get('behaviour'),
        dakhlaNo: formData.get('dakhlaNo'),
        reasonForLeaving: formData.get('reasonForLeaving'),
        address: formData.get('address'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        dateAdded: studentData.dateAdded || new Date().toISOString()
    };

    // Save to Firebase
    try {
        if (studentData.firebaseKey) {
            const studentRef = ref(database, `students/${studentData.firebaseKey}`);
            await update(studentRef, updatedStudent);

            // Show success message
            alert('✅ Student details updated successfully!');

            // Close modal and refresh display
            closeEditModal();
            await loadStudents();
        } else {
            alert('❌ Error: Student reference not found!');
        }
    } catch (error) {
        console.error('Error updating student:', error);
        alert('❌ Error updating student in database. Check console for details.');
    }
});

// Initialize display on page load - load immediately
loadStudents();

// ==================== AUTHENTICATION FUNCTIONS ====================

// Store the intended role to authenticate as
let intendedRole = null;

// Open authentication modal
window.openAuthModal = function (role) {
    intendedRole = role;
    const modal = document.getElementById('authModal');
    if (modal) {
        const title = modal.querySelector('h2');
        if (title) {
            title.textContent = role === 'admin' ? 'Admin Login' : 'Staff Login';
        }
        modal.style.display = 'block';
    }
}

// Close authentication modal
window.closeAuthModal = function () {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'none';
    }
    intendedRole = null;
}

// Sign in with Google
window.signInWithGoogle = async function () {
    const authStatus = document.getElementById('authStatus');

    try {
        authStatus.style.display = 'block';
        authStatus.className = '';
        authStatus.textContent = 'Signing in...';

        // Use popup for all devices (Redirect fails on mobile browsers with strict cross-site storage blocks)
        console.log('Initiating sign in popup...');
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // Check if user email is in whitelist based on intended role
        const isAuthorized = intendedRole === 'admin' ? ADMIN_EMAILS.includes(user.email) : STAFF_EMAILS.includes(user.email);

        if (isAuthorized) {
            authStatus.className = 'success';
            authStatus.textContent = '✅ Authentication successful!';

            setTimeout(() => {
                closeAuthModal();

                // Show dashboard buttons instead of login buttons
                const loginBtns = document.getElementById('loginButtons');
                const dashBtns = document.getElementById('dashboardButtons');
                if (loginBtns) loginBtns.style.display = 'none';
                if (dashBtns) dashBtns.style.display = 'block';
            }, 1000);
        } else {
            // User is not authorized
            authStatus.className = 'error';
            authStatus.textContent = '❌ Access denied. Your email is not authorized to access this system.';

            // Sign out the user
            await signOut(auth);

            setTimeout(() => {
                authStatus.style.display = 'none';
            }, 4000);
        }
    } catch (error) {
        console.error('Authentication error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        authStatus.className = 'error';

        if (error.code === 'auth/popup-closed-by-user') {
            authStatus.textContent = '⚠️ Sign-in cancelled. Please try again.';
        } else if (error.code === 'auth/popup-blocked') {
            authStatus.textContent = '⚠️ Popup blocked. Please allow popups for this site.';
        } else if (error.code === 'auth/cancelled-popup-request') {
            authStatus.textContent = '⚠️ Only one sign-in popup allowed at a time.';
        } else if (error.code === 'auth/unauthorized-domain') {
            authStatus.textContent = '❌ Domain not authorized. Please contact admin.';
        } else if (error.code === 'auth/operation-not-allowed') {
            authStatus.textContent = '❌ Google sign-in not enabled. Please contact admin.';
        } else {
            authStatus.textContent = `❌ ${error.message || 'Authentication failed. Please try again.'}`;
        }

        setTimeout(() => {
            authStatus.style.display = 'none';
        }, 6000);
    }
}

// Sign out user
async function signOutUser() {
    try {
        await signOut(auth);
        alert('✅ Signed out successfully!');

        // Navigate back to home tab
        showTab('home');
    } catch (error) {
        console.error('Sign out error:', error);
        alert('❌ Error signing out. Please try again.');
    }
}

// Listen to authentication state changes
// Handle redirect result on page load (for mobile authentication)
getRedirectResult(auth)
    .then((result) => {
        console.log('Checking redirect result...', result);
        if (result && result.user) {
            const user = result.user;
            console.log('User signed in via redirect:', user.email);

            // Check if user is authorized
            if (ADMIN_EMAILS.includes(user.email)) {
                console.log('User authorized!');
                // User is authorized, check for intended tab
                const savedIntendedTab = sessionStorage.getItem('intendedTab');
                if (savedIntendedTab) {
                    sessionStorage.removeItem('intendedTab');

                    // Navigate to intended tab
                    setTimeout(() => {
                        document.querySelectorAll('.tab-content').forEach(tab => {
                            tab.classList.remove('active');
                        });

                        if (savedIntendedTab === 'admission') {
                            const admissionTab = document.getElementById('admission-tab');
                            if (admissionTab) admissionTab.classList.add('active');
                        } else if (savedIntendedTab === 'students') {
                            const studentsTab = document.getElementById('students-tab');
                            if (studentsTab) studentsTab.classList.add('active');
                            displayStudents();
                        }
                    }, 500);
                }
            } else {
                // User is not authorized
                console.log('User not authorized:', user.email);

                // Sign out the unauthorized user
                signOut(auth).then(() => {
                    // Show modal with error message
                    const authModal = document.getElementById('authModal');
                    const authStatus = document.getElementById('authStatus');

                    if (authModal && authStatus) {
                        authModal.style.display = 'block';
                        authStatus.style.display = 'block';
                        authStatus.className = 'error';
                        authStatus.innerHTML = `
                            <strong>❌ Access Denied</strong><br>
                            <span style="font-size: 14px;">Your email (${user.email}) is not authorized to access this system.</span><br>
                            <span style="font-size: 13px; margin-top: 5px; display: block;">Please contact the administrator for access.</span>
                        `;

                        // Keep error visible for longer on mobile
                        setTimeout(() => {
                            authStatus.style.display = 'none';
                        }, 8000);
                    }

                    // Also show an alert as backup
                    setTimeout(() => {
                        alert(`❌ Access Denied\n\nYour email (${user.email}) is not authorized to access this system.\n\nPlease contact the administrator for access.`);
                    }, 300);
                });
            }
        } else {
            console.log('No redirect result found');
        }
    })
    .catch((error) => {
        console.error('Redirect result error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);

        // Show modal with error
        const authModal = document.getElementById('authModal');
        const authStatus = document.getElementById('authStatus');

        if (error.code === 'auth/unauthorized-domain') {
            if (authModal && authStatus) {
                authModal.style.display = 'block';
                authStatus.style.display = 'block';
                authStatus.className = 'error';
                authStatus.innerHTML = `
                    <strong>❌ Domain Not Authorized</strong><br>
                    <span style="font-size: 13px;">This domain is not authorized in Firebase.</span><br>
                    <span style="font-size: 12px; margin-top: 5px; display: block;">Administrator: Add this domain to Firebase Console → Authentication → Settings → Authorized domains</span>
                `;
            }
            alert('❌ This domain is not authorized in Firebase. Please add it to authorized domains in Firebase Console.');
        } else if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/network-request-failed') {
            if (authModal && authStatus) {
                authModal.style.display = 'block';
                authStatus.style.display = 'block';
                authStatus.className = 'error';
                authStatus.innerHTML = `
                    <strong>❌ Authentication Failed</strong><br>
                    <span style="font-size: 13px;">${error.message || 'Please try again.'}</span>
                `;
            }
            alert(`❌ Authentication error: ${error.message}`);
        }
    });

onAuthStateChanged(auth, (user) => {
    if (user && (ADMIN_EMAILS.includes(user.email) || STAFF_EMAILS.includes(user.email))) {
        // User is signed in and authorized
        currentUser = user;
        currentUserRole = ADMIN_EMAILS.includes(user.email) ? 'admin' : 'staff';

        // Show user info in navigation
        const userAuthDisplay = document.getElementById('userAuthDisplay');
        const displayUserEmail = document.getElementById('displayUserEmail');
        const userRoleDisplay = document.getElementById('userRoleDisplay');

        if (userAuthDisplay && displayUserEmail) {
            displayUserEmail.textContent = user.email;
            displayUserEmail.title = user.email; // Show full email on hover
            if (userRoleDisplay) userRoleDisplay.textContent = currentUserRole === 'admin' ? 'Admin' : 'Staff';
            userAuthDisplay.style.display = 'flex';

            // Add pulse animation on first appearance
            setTimeout(() => {
                userAuthDisplay.style.animation = 'scaleIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55), pulseGlow 2s ease-in-out 0.5s 2';
            }, 100);

            // If on home tab, swap login buttons for dashboard buttons
            const loginBtns = document.getElementById('loginButtons');
            const dashBtns = document.getElementById('dashboardButtons');
            if (loginBtns) loginBtns.style.display = 'none';
            if (dashBtns) dashBtns.style.display = 'block';
        }

        // Show user info in modal (if open)
        const userInfo = document.getElementById('userInfo');
        const userEmail = document.getElementById('userEmail');
        if (userInfo && userEmail) {
            userEmail.textContent = user.email;
            userInfo.style.display = 'block';
        }

        // Re-render students to update action buttons permissions
        if (typeof students !== 'undefined' && students.length > 0) {
            displayStudents();
        }
    } else {
        // User is signed out or not authorized
        currentUser = null;
        currentUserRole = null;

        // Hide user info in navigation
        const userAuthDisplay = document.getElementById('userAuthDisplay');
        if (userAuthDisplay) {
            userAuthDisplay.style.display = 'none';
        }

        // Reset home tab buttons
        const loginBtns = document.getElementById('loginButtons');
        const dashBtns = document.getElementById('dashboardButtons');
        if (loginBtns) loginBtns.style.display = 'block';
        if (dashBtns) dashBtns.style.display = 'none';

        // Hide user info in modal
        const userInfo = document.getElementById('userInfo');
        if (userInfo) {
            userInfo.style.display = 'none';
        }
    }
});

// ==================== END AUTHENTICATION FUNCTIONS ====================

window.addEventListener('DOMContentLoaded', function () {
    // Page elements ready
});

// Expose functions to global scope for HTML onclick handlers
window.showTab = showTab;
window.filterStudents = filterStudents;
window.exportToCSV = exportToCSV;
window.toggleNav = toggleNav;
window.deleteStudent = deleteStudent;
window.generateCertificate = generateCertificate;
window.generateBonafide = generateBonafide;
window.editStudent = editStudent;
window.closeEditModal = closeEditModal;
window.closeModal = closeModal;
window.closeBonafideModal = closeBonafideModal;
window.printCertificate = printCertificate;
window.printBonafide = printBonafide;
window.signInWithGoogle = signInWithGoogle;
window.signOutUser = signOutUser;
window.closeAuthModal = closeAuthModal;

const animatedElements = document.querySelectorAll('.service-card, .feature-card, .testimonial-card, .features-section, .specialty-section, .tech-card, .keyfeature-item');
animatedElements.forEach(element => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(20px)';
    element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    if (typeof observer !== 'undefined') {
        observer.observe(element);
    }
});

// Toast Notification System
window.showToast = function (message, type = 'success') {
    let toast = document.getElementById('customToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'customToast';
        document.body.appendChild(toast);
    }

    toast.className = `custom-toast ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

