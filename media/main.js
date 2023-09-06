(function () {
    const vscode = acquireVsCodeApi();

    window.addEventListener('message', event => {
        const message = event.data;
        console.log(event); 
        switch (message.type) {
            case 'updateNotes':
                {
                    updateNotesList(message.notes)
                    break
                }
        }
    });

    vscode.postMessage({ type: 'updateNotes'});

    /**
     * @param {any} notes
     */
    function updateNotesList(notes) {
        const notesDiv = document.querySelector('.notes-div');
        notesDiv.textContent = '';
    
        for (const note of notes) {
            const noteBlock = document.createElement('div');
            noteBlock.classList.add('note-block');
            
            noteBlock.id=`note-${note.id}`;
            noteBlock.addEventListener('click', () => {
                onNoteClicked(note)
            });
            
            const title = document.createElement('h3');
            title.innerText = `# ${note.start_line}-${note.end_line}`;
            title.classList.add('note-title');
            
            const noteArea = document.createElement('div');
            noteArea.innerHTML = note.note_text;
            noteArea.classList.add('note-area');
            noteArea.setAttribute('contenteditable', 'true');
            
            noteArea.addEventListener('blur', () => onNoteUpdate(note, noteArea.innerHTML))

            const codeContainer = document.createElement('div');
            codeContainer.classList.add('code-container');
    
            const codePre = document.createElement('pre');
            codePre.textContent = note.code_text; // Prefer using textContent over innerText
            codePre.classList.add('code-area');
            
            codeContainer.appendChild(codePre);
            noteBlock.appendChild(title);
            noteBlock.appendChild(noteArea);
            noteBlock.appendChild(codeContainer);
    
            notesDiv.appendChild(noteBlock);
        }

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
}());


