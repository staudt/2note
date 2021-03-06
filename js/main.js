function newUuid() {
    function s4() { return Math.floor((1 + Math.random()) * 0x10000).toString(16) .substring(1); }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

(function () {
    "use strict";

    var NoteModel = (function(){

        function NoteModel(title, content, uuid) {
            Object.call(this);
            this.uuid = uuid ? uuid : 'note-' + newUuid();
            this.title = title ? title : 'New note';
            this.content = content ? content : '';
        }; NoteModel.prototype = Object.create(Object.prototype);

        return NoteModel;    
    })();

    var NoteCollection = (function() {
        
        function NoteCollection() {
            Object.call(this);
            this.currentIndex = 0;
            this.notes = [];
        }; NoteCollection.prototype = Object.create(Object.prototype);

        NoteCollection.prototype.setup = function() {
            if (typeof(localStorage) == "undefined") {
                return false;
            } 
            /* first timer? */
            if (!localStorage.getItem('notes')) {
                this.addNote(new NoteModel('Welcome!', 'This is your first note. Start writing!'));
            } else {
                var uuids = JSON.parse(localStorage.getItem('notes'));
                var note, rawnote;
                for (var i=0;i<uuids.length;i++) {
                    note = new NoteModel();
                    note.uuid = uuids[i];
                    rawnote = JSON.parse(localStorage.getItem(note.uuid));
                    if (rawnote) {
                        note.title = rawnote.title;
                        note.content = rawnote.content;
                    } else {
                        note.title = "?";
                    }
                    this.notes.push(note);
                }
            }
            return true;
        }

        NoteCollection.prototype.addNote = function(note) {
            this.notes.push(note);
            this.updateNote(note);
            this.updateIndex();
            this.currentIndex = this.notes.length-1;
        }

        NoteCollection.prototype.updateNote = function(note) {
            localStorage.setItem(note.uuid, JSON.stringify(note));
        }

        NoteCollection.prototype.deleteNote = function(note) {
            localStorage.removeItem(note.uuid);
            var index = this.notes.indexOf(note);
            this.notes.splice(index, 1);
            if (index == this.currentIndex)
                this.currentIndex = index > (this.notes.length-1) ? 0 : index;
            if (this.notes.length > 0) {
                this.updateIndex();
            } else {
                this.addNote(new NoteModel('All clear'));
            }
        }

        NoteCollection.prototype.updateIndex = function() {
            var uuids = [];
            for (var i=0;i<this.notes.length;i++) {
                uuids.push(this.notes[i].uuid);
            }
            localStorage.setItem('notes', JSON.stringify(uuids));
        }

        NoteCollection.prototype.getNoteByUuid = function(uuid) {
            for (var i=0;i<this.notes.length;i++) {
                if (this.notes[i].uuid == uuid) {
                    return this.notes[i];
                }
            }
            return null;
        }

        NoteCollection.prototype.setCurrentNote = function(note) {
            this.currentIndex = this.notes.indexOf(note);
        }

        NoteCollection.prototype.getCurrentNote = function() {
            return this.notes[this.currentIndex];
        }

        return NoteCollection;
    })();

    var NoteView = (function () {

        function NoteView() {
            Object.call(this);
            this.collection = new NoteCollection();
            if (!this.collection.setup()) {
                alert('Error! Could not retrieve data. Are you using an old browser?');
            }
            this.setupTabs();
            this.setupNoteEvents();
        }; NoteView.prototype = Object.create(Object.prototype);

        NoteView.prototype.setupNoteEvents = function() {
            $('#title').on('keyup focusout', function (e) {
                var note = noteView.collection.getCurrentNote();
                note.title = $('#title').html();
                $('#sidebar').find('#' + note.uuid).html(note.title);
                noteView.collection.updateNote(note);
            });
            $('#content').on('keyup focusout', function (e) {
                var note = noteView.collection.getCurrentNote();
                note.content = $('#content').html();
                noteView.collection.updateNote(note);
            });
            $('#sidebar').find('#addtab').click(function() {
                noteView.newTab();
            })
            $('#delete').click(function (e) {
                if(confirm('Are you sure you want delete this note?')) {
                    noteView.deleteCurrentNote();
                }
            });
        }

        NoteView.prototype.updateTabEvents = function() {
            $('#sidebar').find('.note').click(function(e) {
                noteView.selectTab(e.target.id);
            })
        }

        NoteView.prototype.newTab = function() {
            noteView.collection.addNote(new NoteModel('New note'));
            noteView.setupTabs();
        }

        NoteView.prototype.selectTab = function(id) {
            this.collection.setCurrentNote(this.collection.getNoteByUuid(id));
            this.setupTabs();
        }

        NoteView.prototype.setupTabs = function() {
            $('#sidebar').find('div.note').remove();
            $.each(this.collection.notes, function (i, note) {
                $('<div class="tab note"/>').attr('id', note.uuid).html(note.title).insertBefore("#addtab");
            });
            this.updateSelectedTab();
            this.updateTabEvents();
        }

        NoteView.prototype.updateSelectedTab = function() {
            $('#sidebar').find("div.selected").removeClass('selected');
            $('#sidebar').find("#" + this.collection.getCurrentNote().uuid).addClass('selected');
            this.updateContent();
        }

        NoteView.prototype.updateContent = function() {
            $('#title').html(this.collection.getCurrentNote().title);
            $('#content').html(this.collection.getCurrentNote().content);
        }

        NoteView.prototype.deleteCurrentNote = function() {
            this.collection.deleteNote(this.collection.getCurrentNote());
            this.setupTabs();
        }

        return NoteView;
    })();

    var noteView = new NoteView();
})();