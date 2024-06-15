import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getDatabase, get, ref, update } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCbPjQqY5T2tWqXeDx_CJNB55DqC_9rFe8",
    authDomain: "receiptdb-2ee46.firebaseapp.com",
    projectId: "receiptdb-2ee46",
    storageBucket: "receiptdb-2ee46.appspot.com",
    messagingSenderId: "1081206126953",
    appId: "1:1081206126953:web:31fc48507e771fb8d0e5f8"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase();

function sanitizeKey(key){
    return key.replace(/[.#$[\]/]/g, "_");
}

async function checkTeacherRegistration(facultyIdNumber, password) {
    const sanitizedFacultyIdNumber = sanitizeKey(facultyIdNumber);
    const teacherRef = ref(db, `Registered Teacher/${sanitizedFacultyIdNumber}`);
    const snapshot = await get(teacherRef);
    
    if (snapshot.exists()) {
        const teacherData = snapshot.val();
        return teacherData.Password === password;
    }
    return false;
}

async function fetchEventNames(facultyIdNumber) {
    const eventsRef = ref(db, `Teacher's Form/${facultyIdNumber}/Events`);
    const snapshot = await get(eventsRef);
    return snapshot.exists() ? Object.keys(snapshot.val()) : [];
}

function populateEventOptions(events) {
    const eventOptions = document.getElementById("eventOptions");
    eventOptions.innerHTML = '<option value="" disabled selected>Select Event</option>';
    events.forEach(event => {
        const option = document.createElement("option");
        option.value = event;
        option.textContent = event;
        eventOptions.appendChild(option);
    });
}

const expectedKey = "Hello123";
let isProcessing = false;
let scanner;

const reverseMapping = {
    'x': 'a', 'y': 'b', 'z': 'c', 'a': 'd', 'b': 'e',
    'c': 'f', 'd': 'g', 'e': 'h', 'f': 'i', 'g': 'j',
    'h': 'k', 'i': 'l', 'j': 'm', 'k': 'n', 'l': 'o',
    'm': 'p', 'n': 'q', 'o': 'r', 'p': 's', 'q': 't',
    'r': 'u', 's': 'v', 't': 'w', 'u': 'x', 'v': 'y',
    'w': 'z', 'X': 'A', 'Y': 'B', 'Z': 'C', 'A': 'D',
    'B': 'E', 'C': 'F', 'D': 'G', 'E': 'H', 'F': 'I',
    'G': 'J', 'H': 'K', 'I': 'L', 'J': 'M', 'K': 'N',
    'L': 'O', 'M': 'P', 'N': 'Q', 'O': 'R', 'P': 'S',
    'Q': 'T', 'R': 'U', 'S': 'V', 'T': 'W', 'U': 'X',
    'V': 'Y', 'W': 'Z', '9': '0', '8': '1', '7': '2',
    '6': '3', '5': '4', '4': '5', '3': '6', '2': '7',
    '1': '8', '0': '9'
};

function decodeData(encodedData) {
    let decodedData = '';
    for (let i = 0; i < encodedData.length; i++) {
        let char = encodedData[i];
        decodedData += reverseMapping[char] || char;
    }
    return decodedData;
}

let errorLogged = false;

function success(result) {
    if (isProcessing) return; // Exit if already processing
    isProcessing = true; // Set the flag

    let decodedData = decodeData(result);

    const dataArray = decodedData.split(',');
    const key = dataArray.pop(); 
    const studentData = dataArray.join(','); 

    const studentNo = dataArray[0];
    const teacherName = dataArray[3];
    const eventName = dataArray[4];

    const selectedEvent = document.getElementById("eventOptions").value;

    if (eventName !== selectedEvent) {
        alert(`The scanned QR code pertains to the event '${eventName}', which does not correspond to the selected event '${selectedEvent}'.`);
        isProcessing = false; // Reset the flag
        return;
    }

    if (key === expectedKey) {
        const popupContent = document.querySelector('#popup-content');
        popupContent.innerHTML = ''; // Clear previous content to avoid duplication
        const fields = ['Student Number', 'Full Name', 'Section', 'Teacher Name', 'Event', 'Amount', 'Payment Method', 'Payment App', 'Reference Number'];

        for (let i = 0; i < fields.length; i++) {
            const field = fields[i];
            const value = studentData.split(',')[i].trim();
            const pElement = document.createElement('p');
            pElement.innerHTML = `<strong>${field} : </strong>${value}`;
            popupContent.appendChild(pElement);
        }

        insertScan(studentNo, teacherName, eventName);
        document.getElementById('popup').style.display = 'block';
        document.getElementById('reader').style.display = 'none';
        scanner.clear();

    } else {
        alert("Invalid QR code. Please scan a valid QR code.");
    }

    isProcessing = false; // Reset the flag
}

function error(err) {
    if (!errorLogged) {
        console.error(err);
        errorLogged = true; 
    }
}

function insertScan(studentNo, teacherName, eventName) {
    const teacherPath = `Student Receipts/${teacherName}`;
    const eventPath = `${teacherPath}/Events/${eventName}`;
    const studentPath = `${eventPath}/${studentNo}`;

    checkIfTeacherAndEventExist(teacherPath, eventPath, studentPath);
}

function checkIfTeacherAndEventExist(teacherPath, eventPath, studentPath) {
    const teacherRef = ref(db, teacherPath);
    const eventRef = ref(db, eventPath);

    Promise.all([
        get(teacherRef),
        get(eventRef)
    ]).then(([teacherSnapshot, eventSnapshot]) => {
        if (!teacherSnapshot.exists() || !eventSnapshot.exists()) {
            alert("Teacher or event not found!");
        } else {
            checkIfStudentExists(studentPath);
        }
    }).catch((error) => {
        console.error("Error:", error);
        alert("Unsuccessful, error occurred.");
    });
}

function checkIfStudentExists(studentPath) {
    const studentRef = ref(db, studentPath);
    get(studentRef).then((studentSnapshot) => {
        if (studentSnapshot.exists()) {
            const studentData = studentSnapshot.val();
            if (studentData.Scan === "Scanned") {
                alert("This student has already been scanned.");
            } else {
                updateStudentScan(studentPath);
            }
        } else {
            alert("Student not found!");
        }
    }).catch((error) => {
        console.error("Error:", error);
        alert("Unsuccessful, error occurred.");
    });
}

function updateStudentScan(studentPath) {
    update(ref(db, studentPath), { Scan: "Scanned" })
    .then(() => {
        alert("Scan updated successfully!");
    })
    .catch((error) => {
        console.error("Error:", error);
        alert("Unsuccessful, error occurred.");
    });
}

function validateForm() {
    const eventOptions = document.getElementById("eventOptions");
    return eventOptions.value.trim() !== '';
}

const facultyIDVerifyPopup = document.getElementById("facultyIDVerifyPopup");
const scanBtn = document.getElementById("scanBtn");
const closeFacultyBtn = document.getElementById("closeFacultyBtn");
const closeEventBtn = document.getElementById("closeEventBtn");

function closeFacultyIDPopup() {
    facultyIDVerifyPopup.style.display = "none";
}

function showFacultyIDPopup() {
    facultyIDVerifyPopup.style.display = "block";
}

function closeEventPopup() {
    document.getElementById("scannerEventSelectPopup").style.display = "none";
}

document.addEventListener("DOMContentLoaded", function() {

    scanBtn.addEventListener("click", function() {
        showFacultyIDPopup();
    });

    closeFacultyBtn.addEventListener("click", function() {
        closeFacultyIDPopup();
    });

    closeEventBtn.addEventListener("click", function() {
        closeEventPopup();
    });

    document.getElementById("searchButton").addEventListener("click", async function() {
        const facultyIdNumber = document.getElementById("facultyNoInput").value.trim();
        const password = document.getElementById("password").value.trim();
        const isRegistered = await checkTeacherRegistration(facultyIdNumber, password);
        
        if (isRegistered) { 
            const events = await fetchEventNames(facultyIdNumber);
            populateEventOptions(events);
            document.getElementById("facultyIDVerifyPopup").style.display = "none";
            document.getElementById("scannerEventSelectPopup").style.display = "block";
        } else {
            alert("Invalid faculty number or password. Please try again.");
            document.getElementById("facultyNoInput").value = "";
            document.getElementById("password").value = "";
        }
    });

    document.getElementById("submitButton").addEventListener("click", async function(event) {
        event.preventDefault(); // Prevent the form from submitting
        
        if (!validateForm()) {
            alert("Please select an event before proceeding.");
            return;
        }

        document.getElementById("scannerContainer").style.visibility = "visible";
        document.getElementById("scannerEventSelectPopup").style.display = "none"; 
        document.getElementById("scanBtn").style.display = "none";

        // Initialize the scanner
        if (typeof Html5QrcodeScanner !== 'undefined') {
            scanner = new Html5QrcodeScanner('reader', {
                qrbox: {
                    width: 200,
                    height: 200
                },
                fps: 10,
            });

            scanner.render(success, error);
        } else {
            console.error("Html5QrcodeScanner is not defined");
        }
    });
});