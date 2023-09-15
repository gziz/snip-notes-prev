(function() {
    const vscode = acquireVsCodeApi();

    window.addEventListener('message', handleMessage);
    document.querySelector('.note-search-bar').addEventListener('keyup', handleSearch);
    document.addEventListener('contextmenu', handleRightClick);

    vscode.postMessage({ type: 'refreshNotes' });

    function handleMessage(event) {
        const message = event.data;
        switch (message.type) {
            case 'refreshNotes':
                refreshNotes(message.notes);
                break;
            case 'focusOnNote':
                const noteId = message.noteId;
                focusOnNote(noteId);
        }
    }

    function handleSearch(event) {
        const searchTerm = event.target.value.toLowerCase();
        filterNotesByTerm(searchTerm);
    }

    function handleRightClick(event) {
        let target = getClosestElement(event.target, '.note-container');
        if (target) {
            const noteId = parseInt(target.getAttribute('id').split('-')[1]);
            vscode.postMessage({
                type: 'rightClickedNote',
                noteId: noteId
            });
        }
    }

    function getClosestElement(elem, selector) {
        for (; elem && elem !== document; elem = elem.parentElement) {
            if (elem.matches(selector)) return elem;
        }
        return null;
    }

    function focusOnNote(noteId) {
        const noteToFocus = document.getElementById(`note-${noteId}`);
        if (noteToFocus) {
            noteToFocus.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }
    function refreshNotes(notes) {
        const notesDiv = document.querySelector('.notes-div');
        notesDiv.textContent = '';

        for (const note of notes) {
            const noteContainer = createNoteContainer(note);
            notesDiv.appendChild(noteContainer);

        }
        const searchTerm = document.querySelector('.note-search-bar').value.toLowerCase();
        filterNotesByTerm(searchTerm);
    }

    const emojiMap = {
        note: "💡",
        todo: "✅",
        fix: "🔧"
    };

    function createNoteHeader(note) {
        const headerWrapper = document.createElement('div');
        headerWrapper.classList.add('header-wrapper');
    
        // Get the emoji based on the note's category
        const emoji = document.createElement('span');
        emoji.classList.add('note-emoji');
        emoji.textContent = emojiMap[note.category] || "💡";
    
        headerWrapper.appendChild(emoji);
    
        // Create title div
        const headerContent = document.createElement('div');
        headerContent.innerHTML = note.title;
        headerContent.classList.add('header-content');
        headerContent.setAttribute('contenteditable', 'true');
    
        headerContent.addEventListener('blur', () => updateNoteTitle(note, headerContent.innerHTML));
        headerContent.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                headerContent.blur();
            }
        });
        
        headerWrapper.appendChild(headerContent);
        
        return headerWrapper;
    }

    function createNoteContent(note) {
        const noteContent = document.createElement('div');
        noteContent.innerHTML = note.note_text;
        noteContent.classList.add('note-content');
        noteContent.setAttribute('contenteditable', 'true');

        noteContent.addEventListener('blur', () => updateNoteContent(note, noteContent.innerHTML));
        noteContent.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                noteContent.blur();
            }
        });

        return noteContent;
    }

    function createCodeContent(note) {
        const codeContainer = document.createElement('div');
        codeContainer.classList.add('code-container');
    
        const codePre = document.createElement('pre');
        const codeElement = document.createElement('code');
        codeElement.classList.add(`language-${note.language_id}`);
        codeElement.textContent = normalizeCodeIndentation(note.code_text);

        codePre.appendChild(codeElement);
        codePre.classList.add('code-content');

        Prism.highlightElement(codeElement);

        codeContainer.appendChild(codePre);
        return codeContainer;
    }

    function createNoteContainer(note) {
        const noteContainer = document.createElement('div');
        noteContainer.classList.add('note-container');
        noteContainer.id = `note-${note.id}`;
        noteContainer.setAttribute('data-vscode-context', '{"webviewSection": "noteContainer", "preventDefaultContextMenuItems": true}');
        
        noteContainer.addEventListener('click', () => onNoteClick(note));

        noteContainer.appendChild(createNoteHeader(note));
        noteContainer.appendChild(createNoteContent(note));
        noteContainer.appendChild(createCodeContent(note));

        return noteContainer;
    }

    function onNoteClick(note) {
        vscode.postMessage({ type: 'noteClicked', value: note.start_line });
    }

    function updateNoteContent(note, newContent) {
        if (newContent !== note.note_text) {
            note.note_text = newContent;
            vscode.postMessage({ type: 'noteUpdated', updatedNote: note });
        }
    }

    function updateNoteTitle(note, newTitle) {
        if (newTitle !== note.title) {
            note.title = newTitle;
            vscode.postMessage({ type: 'noteUpdated', updatedNote: note });
        }
    }

    function filterNotesByTerm(term) {
        const notesContainers = document.querySelectorAll('.note-container');
    
        for (const container of notesContainers) {
            const noteContent = container.querySelector('.note-content').textContent.toLowerCase();
            const codeContent = container.querySelector('.code-content').textContent.toLowerCase();

            if (noteContent.includes(term) || codeContent.includes(term)) {
                container.style.display = ''; // show
            } else {
                container.style.display = 'none'; // hide
            }
        }
    }

    function normalizeCodeIndentation(code) {
        const lines = code.split('\n');
        const linesWithCode = lines.filter(line => line.trim() !== '');
        if (linesWithCode.length === 0) return code;

        const minIndent = Math.min(
            ...linesWithCode.map(line => line.search(/\S/))
        );

        return lines.map(line => line.substring(minIndent)).join('\n');
    }
})();
