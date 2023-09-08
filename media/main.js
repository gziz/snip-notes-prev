(function () {
    const vscode = acquireVsCodeApi();

    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'refreshNotes':
                {
                    const newNoteId = message.newNoteId ? message.newNoteId : null;
                    refreshNotes(message.notes, newNoteId)
                    break
                }
        }
    });

    vscode.postMessage({ type: 'refreshNotes'});

    document.querySelector('.search-bar').addEventListener('keyup', function(event) {
        const searchTerm = event.target.value.toLowerCase();
        filterNotes(searchTerm);
    });

    document.addEventListener('contextmenu', (event) => {
        // Check if the clicked element or its parent is a note
        let target = event.target;
        while (target && !target.classList.contains('note-block')) {
            target = target.parentElement;
        }
    
        if (target && target.classList.contains('note-block')) {
            const htmlNoteId = target.getAttribute('id');
            const noteId = htmlNoteId.split('-')[1];
            vscode.postMessage({
                type: 'rightClickedNote',
                noteId: parseInt(noteId)
            });
            console.log(noteId);
        }
      });

    /**
     * @param {any} notes
     */
    function refreshNotes(notes, focusNoteId=null) {
        const notesDiv = document.querySelector('.notes-div');
        notesDiv.textContent = '';
    
        for (const note of notes) {
            const noteBlock = document.createElement('div');
            noteBlock.classList.add('note-block');
            noteBlock.id=`note-${note.id}`;
            noteBlock.setAttribute(
                'data-vscode-context',
                '{"webviewSection": "noteBlock", "preventDefaultContextMenuItems": true}'
                );

            noteBlock.addEventListener('click', () => {
                onNoteClicked(note)
            });
            
            const title = document.createElement('h3');
            title.innerText = `# ${note.start_line + 1}-${note.end_line + 1}`;
            title.classList.add('note-title');
            
            const noteArea = document.createElement('div');
            noteArea.innerHTML = note.note_text;
            noteArea.classList.add('note-area');
            noteArea.setAttribute('contenteditable', 'true');
            
            noteArea.addEventListener('blur', () => onNoteUpdate(note, noteArea.innerHTML))
            noteArea.addEventListener('keydown', function(event) {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    noteArea.blur();
                }
            });

            const codeContainer = document.createElement('div');
            codeContainer.classList.add('code-container');
    
            const codePre = document.createElement('pre');
            codePre.textContent = normalizeIndentation(note.code_text);
            codePre.classList.add('code-area');
            
            codeContainer.appendChild(codePre);
            noteBlock.appendChild(title);
            noteBlock.appendChild(noteArea);
            noteBlock.appendChild(codeContainer);
    
            notesDiv.appendChild(noteBlock);

            if (focusNoteId) {
                const noteToFocus = document.getElementById(`note-${focusNoteId}`);
                if (noteToFocus) {
                    noteToFocus.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }
            }
        }
        const searchTerm = document.querySelector('.search-bar').value.toLowerCase();
        filterNotes(searchTerm);
    }

    /** 
     * @param {any} note
     */
    function onNoteClicked(note) {
        vscode.postMessage({ type: 'noteClicked', value: note.start_line });
    }

    function onNoteUpdate(note, newNoteText) {
        if (newNoteText !== note.note_text) {
            note.note_text = newNoteText
            vscode.postMessage({ type: 'noteUpdated', newNote: note});
        }
    }

    function filterNotes(term) {
        const notesBlocks = document.querySelectorAll('.note-block');
    
        for (const block of notesBlocks) {
            const noteText = block.querySelector('.note-area').textContent.toLowerCase();
            const codeText = block.querySelector('.code-area').textContent.toLowerCase();

            if (noteText.includes(term) || codeText.includes(term)) {
                block.style.display = ''; // show
            } else {
                block.style.display = 'none'; // hide
            }
        }
    }

    function normalizeIndentation(code) {
        // Empty lines have a left padding of 0, take the min based on only lines of code.
        const lines = code.split('\n')
        const linesOnlyCode = lines.filter(line => line.trim() !== '');
        if (linesOnlyCode.length === 0) return code;  // No lines to process
    
        const minIndent = Math.min(
            ...linesOnlyCode.map(line => line.search(/\S/))  // Find first non-whitespace character for each line
        );
    
        return lines.map(line => line.substring(minIndent)).join('\n');
    }

}());


