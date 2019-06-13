import mongoose from "mongoose";
import { isEmail, isMobilePhone } from 'validator';

// export interface IUser extends mongoose.Document {
//     email: string;
//     name: string;
//     entryNumber: string;
//     hostel: string;
//     gender: string;
//     joinYear: Date;
//     gradYear: Date;
//     birthDate: Date;
//     mobileNumber: Date;
//     hometown: string;
//     interests: string;
//     specialization?: string;
//     intro: string;
//     displayOnWebsite: boolean;
//     links?: {[key: string]: string };
//     createdAt?: Date;
//     updatedAt?: Date;
// };


const userSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true,
        required: true,
        validate: [ isEmail, 'invalid email' ],
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    entryNumber: {
        type: String,
        // required: true,
        uppercase: true,
        // unique: true,
        minlength: 11,
        maxlength: 11,
        trim: true,
        index: true,
        default: "XXXXXXXXXXX"
    },
    hostel: {
        type: String,
        // required: true,
        uppercase: true,
        enum: ["SATPURA", "GIRNAR", "UDAIGIRI", "ZANSKAR", "ARAVALI", "KUMAON", "VINDHYACHAL", "JWALAMUKHI", "NILGIRI", "KARAKORAM", "SHIVALIK", "KAILASH", "HIMADRI"]
        trim: true,
        default: "SATPURA"
    },
    gender: {
        type: String,
        // required: true,
        enum:  ["male", "female", "other"],
        default: "male"
    },
    joinYear: {
        type: Date,
        // required: true,
        default: "01/01/2015",
    },
    gradYear: {
        type: Date,
        required: true,
        default: "01/01/2019",
    },
    birthDate: {
        type: Date,
        // required: true,
        default: "01/01/1997",
    },
    mobileNumber: {
        type: String,
        // required: true,
        validate: [ (mob) => isMobilePhone(mob, 'any', { strictMode: true }), 'invalid mobile number'],
        default: "+919999999999",
    },
    hometown: {
        type: String,
        // required: true,
        default: "",
    },
    interests: {
        type: String,
        // required: true,
        default: "",
    },
    specialization: {
        type: String,
        // required: true,
        default: "",
    },
    intro: {
        type: String,
        // required: true,
        default: "",
    },
    displayOnWebsite: {
        type: Boolean,
        // required: true,
        default: false
    },
    links: {
        type: Map,
        of: String
    },
    create_date: {
        type: Date,
        // required: true,
        default: "01/01/1997"
    },
    created_by: {
        type: type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    update_date: {
        type: Date,
        // required: true,
        default: "01/01/1997"
    },
    updated_by: {
        type: type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        // required: true
    },
    privelege_level: {
        type: String,
        enum: ["Admin", "Approved_User", "Unapproved_User"]
        required: true,
        default: "User"
    }
}, { timestamps: true });


const User = mongoose.model("User", userSchema);
export default User;
