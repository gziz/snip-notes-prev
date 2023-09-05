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
            console.log(note);
            const noteBlock = document.createElement('div');
            noteBlock.classList.add('note-block');
            
            noteBlock.id=`note-${note.id}`;
            noteBlock.addEventListener('click', () => {
                onNoteClicked(note)
            });
            
            const title = document.createElement('h3');
            title.innerText = `# ${note.start_line}-${note.end_line}`;
            title.classList.add('note-title');
            
            const noteArea = document.createElement('textarea');
            noteArea.innerText = note.note_text;
            noteArea.classList.add('note-area');
            
            const codeContainer = document.createElement('div');
            codeContainer.classList.add('code-container');
    
            // Create a pre element for displaying code with original formatting
            const codePre = document.createElement('pre');
            codePre.textContent = note.code_text; // Prefer using textContent over innerText
            codePre.classList.add('code-area');
            
            // Append the pre element to its container and then append the container to the note block
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

}());


