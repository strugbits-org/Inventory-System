"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testEmailConfig = exports.sendInviteEmail = void 0;
var nodemailer_1 = require("nodemailer");
var company_invite_template_1 = require("./email-templates/company-invite.template");
var createTransporter = function () {
    var emailUser = process.env.SMTP_USER;
    var emailPassword = process.env.SMTP_PASS;
    if (!emailUser || !emailPassword) {
        throw new Error('Email configuration missing. Please set SMTP_USER and SMTP_PASS in .env');
    }
    return nodemailer_1.default.createTransport({
        service: 'gmail',
        auth: {
            user: emailUser,
            pass: emailPassword,
        },
    });
};
var sendInviteEmail = function (params) { return __awaiter(void 0, void 0, void 0, function () {
    var to, inviteLink, expiresAt, transporter, mailOptions, info, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                to = params.to, inviteLink = params.inviteLink, expiresAt = params.expiresAt;
                transporter = createTransporter();
                mailOptions = {
                    from: "\"".concat(process.env.APP_NAME || 'ResinWerks', "\" <").concat(process.env.SMTP_USER, ">"),
                    to: to,
                    subject: 'You\'re Invited to Join ResinWerks',
                    html: (0, company_invite_template_1.companyInviteEmailTemplate)({ inviteLink: inviteLink, expiresAt: expiresAt }),
                };
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, transporter.sendMail(mailOptions)];
            case 2:
                info = _a.sent();
                console.log('Email sent successfully:', info.messageId);
                return [3 /*break*/, 4];
            case 3:
                error_1 = _a.sent();
                console.error('Error sending email:', error_1);
                throw new Error('Failed to send invitation email');
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.sendInviteEmail = sendInviteEmail;
var testEmailConfig = function () { return __awaiter(void 0, void 0, void 0, function () {
    var transporter, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                transporter = createTransporter();
                return [4 /*yield*/, transporter.verify()];
            case 1:
                _a.sent();
                console.log('Email configuration is valid');
                return [2 /*return*/, true];
            case 2:
                error_2 = _a.sent();
                console.error('Email configuration error:', error_2);
                return [2 /*return*/, false];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.testEmailConfig = testEmailConfig;
