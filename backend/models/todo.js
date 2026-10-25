const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const Todo = new Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 120
    },
    description: {
        type: String,
        default: "",
        maxlength: 2000
    },
    is_complete: {
        type: Boolean,
        default: false
    },
    due_date: {
        type: Date,
        default: null
    }
});

module.exports = mongoose.model("Todo", Todo);
