function getToken() {
    const token = localStorage.getItem('token');
    if (!token || isTokenExpired(token)) {
        redirectToLogin();
        throw new Error('Токен не найден или истек');
    }
    return token;
}

function isTokenExpired(token) {
    try {
        const decodedToken = parseJwt(token);
        const currentTime = Math.floor(Date.now() / 1000);
        return decodedToken.exp < currentTime;
    } catch (error) {
        console.error('Error parsing token:', error.message);
        return true; // Treat token as expired if there's an error
    }
}

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        handleError(error, 'JWT parsing error');
        throw error;
    }
}

function redirectToLogin() {
    localStorage.removeItem('token');
    window.location.href = './authentication-login.html';
}

function handleError(error, message) {
    console.error(message, error);
    clearAlerts();
    showAlert('danger', 'Ошибка:', message);
}

function handleFetchError(response) {
    console.error('Fetch error:', response.statusText);
    if (response.status === 401) {
        redirectToLogin();
    } else {
        handleError(new Error(response.statusText), 'Fetch error');
    }
}

function showAlert(type, title, message) {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        console.error('Alert container not found');
        return;
    }

    const alert = document.createElement('div');
    alert.classList.add('alert', `alert-${type}`, 'alert-dismissible', 'fade', 'show');
    alert.setAttribute('role', 'alert');
    alert.innerHTML = `
        <strong>${title}</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    alertContainer.appendChild(alert);

    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => {
            if (alert.parentElement) alert.parentElement.removeChild(alert);
        }, 150);
    }, 5000);
}

function clearAlerts() {
    const alertContainer = document.getElementById('alertContainer');
    alertContainer.innerHTML = '';
}

async function loadSettings() {
    try {
        const response = await fetch('../settings.json');
        if (!response.ok) throw new Error('Failed to load settings');
        return await response.json();
    } catch (error) {
        handleError(error, 'Error loading settings');
        throw error;
    }
}

async function createNote() {
    try {
        const token = getToken();
        const settings = await loadSettings();

        const title = document.getElementById('inputNoteTitle').value;
        const content = document.getElementById('inputNoteDescription').value;

        const requestBody = { title, content };

        const response = await fetch(`${settings.apiBaseUrl}/notes`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json-patch+json',
                'Accept': '*/*'
            },
            body: JSON.stringify(requestBody)
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || 'Failed to create note');
        }

        console.log('Note created successfully');
        showAlert('success', 'Успех:', responseData.message || 'Note created successfully');
        await getAllNotes(); // Refresh notes list
    } catch (error) {
        console.error('Error:', error.message);
        clearAlerts();
        showAlert('danger', 'Ошибка:', error.message);
    }
}

async function deleteNote(noteId) {
    try {
        const token = getToken();
        const settings = await loadSettings();

        const response = await fetch(`${settings.apiBaseUrl}/notes/${noteId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': '*/*'
            }
        });

        if (!response.ok) {
            const responseData = await response.json();
            throw new Error(responseData.message || 'Failed to delete note');
        }

        console.log('Note deleted successfully');
        showAlert('success', 'Успех:', 'Note deleted successfully');
        await getAllNotes(); // Refresh notes list
    } catch (error) {
        console.error('Error:', error.message);
        clearAlerts();
        showAlert('danger', 'Ошибка:', error.message);
    }
}

async function getNoteById(noteId) {
    try {
        const token = getToken();
        const settings = await loadSettings();

        const response = await fetch(`${settings.apiBaseUrl}/notes/${noteId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': '*/*'
            }
        });

        if (!response.ok) {
            const responseData = await response.json();
            throw new Error(responseData.message || 'Failed to get note');
        }

        const note = await response.json();
        console.log('Note:', note.data);
        // Display note details in the UI
    } catch (error) {
        console.error('Error:', error.message);
        clearAlerts();
        showAlert('danger', 'Ошибка:', error.message);
    }
}

async function getAllNotes() {
    try {
        const token = getToken();
        const settings = await loadSettings();

        const response = await fetch(`${settings.apiBaseUrl}/notes?PageIndex=1&PageSize=20&OrderBy=id&OrderType=desc`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': '*/*'
            }
        });

        if (!response.ok) {
            const responseData = await response.json();
            throw new Error(responseData.message || 'Failed to get notes');
        }

        const notes = await response.json();
        displayNotes(notes.data);
    } catch (error) {
        console.error('Error:', error.message);
        clearAlerts();
        showAlert('danger', 'Ошибка:', error.message);
    }
}

function displayNotes(notes) {
    const notesList = document.getElementById('notesList');
    notesList.innerHTML = '';

    if (!notes || notes.length === 0) {
        const alertItem = document.createElement('div');
        alertItem.className = 'alert alert-info';
        alertItem.role = 'alert';
        alertItem.innerHTML = 'Нет никаких заметок';
        notesList.appendChild(alertItem);
        return;
    }
    notes.forEach(note => {
        const noteItem = document.createElement('div');
        noteItem.className = 'note-item card';
        noteItem.innerHTML = `
            <div class="card-body">
                <div class="mb-3">
                    <label class="form-label">Задача</label>
                    <input type="text" class="form-control" value="${note.title}" disabled>
                </div>
                <div class="mb-3">
                    <label class="form-label">Описание</label>
                    <input type="text" class="form-control" value="${note.content}" disabled>
                </div>
                <div class="d-flex justify-content-between">
                    <button class="btn btn-info" onclick="getNoteById(${note.id})">Просмотр</button>
                    <button class="btn btn-danger" onclick="deleteNote(${note.id})">Удалить</button>
                </div>
            </div>
        `;
        notesList.appendChild(noteItem);
    });
}


document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('createNoteForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        await createNote();
    });

    getAllNotes();
});
