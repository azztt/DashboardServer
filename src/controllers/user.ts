/* eslint-disable @typescript-eslint/indent */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import express from "express";
import User from "../models/user";
import initCRUD from "../utils/crudFactory";
// import rp from "request-promise";

// import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, JWT_SECRET } from "../utils/secrets";
import { JWT_SECRET } from "../utils/secrets";
//import { ADMIN_SECRET } from "../utils/secrets";
// import logger from "../utils/logger";
import jwt, { Secret } from "jsonwebtoken";
import { createResponse, createError } from "../utils/helper";
import { Request, Response, NextFunction } from "express";
// import { checkToken, isSameUser } from "../middlewares/auth";
import bcrypt from "bcrypt";
import { isAdmin, checkAdmin, checkToken } from "../middlewares/auth";
const SALT_WORK_FACTOR = 10;

const router = express.Router({mergeParams: true});
const [create, , update, all, all_query, all_delete, delete_query] = initCRUD(User);

const register = (req: Request, res: Response, next: NextFunction) => {
    req.body.privelege_level = "Unapproved_User";
    req.body.display_on_website = false;
    // req.body.category = 'undefined';
    res.locals.no_send = true;
    create(req, res, next)
    .then((_: any) => {
        res.json(createResponse("Request sent to the Administrator", _));
    })
    .catch((err: any) => {
        res.json(createResponse("Error while registering", err));
    });
};

const getUnapproved = (req: Request, res: Response, next: NextFunction) => {
    const my_query = {privelege_level: "Unapproved_User"};
    req.body.query = my_query;
    res.locals.no_send = true;
    all_query(req, res, next)
    .then((data: any) => {
        return res.json(createResponse("Results", data));
    })
    .catch((err) => {
        return res.json(createResponse("Error", err));
    });
};

const login = (req: Request, res: Response, next: NextFunction) => {
    if (!req.body) {
        next(createError(400, "Bad request", "Received request with no body"));
    }

    const my_password = req.body.password;
    const my_entryNumber = req.body.entry_no;

    // Retrieve the username from the database
    User.findOne({entry_no: my_entryNumber}).then((userDoc) => {
        if (!userDoc) {
            next(createError(404, "Not found", `User with entryNumber ${my_entryNumber} does not exist`));
        } else {
            const userObject = userDoc;

            // Get the hashed password
            const passwordHash = userObject.password;

            if (userObject.privelege_level == "Unapproved_User") {
                next(createError(500, "You are not yet approved", ``));
            }

            // Just.. No.
            //console.log(userPassword);
            //console.log(my_password);

            bcrypt.compare(my_password, passwordHash, function(err, passMatch) {
                if (err || !passMatch) {
                    return next(createError(400, "Incorrect login", `User with username ${my_entryNumber} does not exist or incorrect password entered`));
                }
                
                const payload = {_id: userObject._id};
                const options = {expiresIn: "2d", issuer: "devclub-dashboard"};
                const secret = JWT_SECRET as Secret;

                if (secret === undefined) {
                    return next(createError(500, "Incorrect configuration", `Token secret key not initialized`));
                }

                const token = jwt.sign(payload, secret, options);

                const result = {
                    token: token,
                    status: 200,
                    result: userObject
                };

                res.status(200).send(result);
            });
        }
    })
    .catch((err) => {
        next(err);
    });
};


const hashPassword = (password: string) => {
    return new Promise <string> ((resolve, reject) => {
        bcrypt.genSalt(SALT_WORK_FACTOR, (err: any, salt: any) => {
            if (err) return reject(err);
            bcrypt.hash(password, salt, (err, hash) => {
                if (err) return reject(err);
                resolve(hash);
            })
        })
    });
}

// Authenticate user before this
const changePassword = (req: Request, res: Response, next: NextFunction) => {
    if (res.locals.logged_user_id == undefined) {
        return next(createError(500, "Internal Error", "User not authenticated"));
    }

    if (req.body.newPassword == undefined) {
        return next(createError(400, "New password not given", "Expected newPassword in body of request"));
    }

    hashPassword(req.body.newPassword)
        .then(passwordHash => {
            res.locals.no_send = true;
            req.params.id = res.locals.logged_user_id;
            req.body = {
                password: passwordHash,
                updated_by: res.locals.logged_user_id
            };
            
            console.log(passwordHash);
            update(req, res, next)
                .then(_ => res.json(createResponse("Password updated", "")))
                .catch(err => next(err));
        })
        .catch(err => next(err));
}

// const login = (req: Request, res: Response, next: NextFunction) => {

//     const code_from_github: string = req.body.code;

//     const get_access_token_options = {
//         method: 'POST',
//         uri: 'https://github.com/login/oauth/access_token',
//         body: {
//             'client_id': GITHUB_CLIENT_ID,
//             'client_secret': GITHUB_CLIENT_SECRET,
//             'code': code_from_github
//         },
//         json: true,
//         headers: {
//             'Accept': 'application/json'
//         }
//     };

//     rp(get_access_token_options)
//         .then((parsedBody) => {
//             const access_token: string = parsedBody['access_token'] || '';
//             if (access_token == '') {
//                 logger.warn('Access Token not found');
//                 throw (createError(401,"Unauthorized",`Invalid Code : ${code_from_github}`));
//             }
//             return access_token;
//         })
//         .then(access_token => {
//             const get_details = {
//                 method: 'GET',
//                 uri: 'https://api.github.com/user',
//                 json: true,
//                 headers:{
//                     'Accept': 'application/json',
//                     'Authorization': `token ${access_token}`,
//                     'User-Agent': 'Club Dashboard'
//                 }
//             };
//             return rp(get_details);
//         })
//         .then(user_details => {
//             if (!user_details['email']) {
//                 logger.warn('User email not found');
//                 throw (createError(401, "Unauthorized", "No email found"));
//             }
//             return user_details;
//         })
//         .then(user_details => {
//             return Promise.all([
//                 User.findOne({'email': user_details['email']}), user_details]);
//         })
//         .then(([userInstance, user_details]) => {
//             if (!userInstance) {
//                 const schema_user_details = {
//                     'email': user_details['email'],
//                     'name': user_details['name'],
//                     'links': {
//                         'avatar': user_details['avatar_url'],
//                         'github': user_details['html_url']
//                     }
//                 };
//                 return User.create(schema_user_details);
//             }
//             else
//                 return userInstance;
//         })
//         .then((createdUser) => {
//             const jwt_payload = {
//                 '_id': createdUser._id,
//             };
//             const token: string = jwt.sign(jwt_payload, JWT_SECRET, {expiresIn:'7d'});
//             const resp_data = {
//                 'authToken': token,
//                 'email': createdUser.email,
//                 'name': createdUser.name,
//                 'privelege_level': createdUser.privelege_level,
//                 '_id' : createdUser._id
//             };
//             res.send(createResponse('Login successful', resp_data));
//         })
//         .catch(function (err) {
//             next(err);
//         });
// };

// router.post('/',create);
// router.get('/', checkToken, all);
// router.get('/:id', checkToken, get);
// router.put('/:id', checkToken, isSameUser, update);

// const foo = (req: Request, res: Response, next: NextFunction) => {
//     return all(req, res, next);
// };

const pswd_hash = (req: Request, _: Response, next: NextFunction) => {
    /* bcrypt.genSalt(SALT_WORK_FACTOR, function (err: any, salt: any) {
        if (err) console.log(err);
        // hash the password using our new salt
        bcrypt.hash(req.body.password, salt, function (err: any, hash: any) {
            if (err) console.log(err);
            req.body.password = hash;
            next();
        });
    }); */
    hashPassword(req.body.password)
        .then(passwordHash => {
            req.body.password = passwordHash;
            next();
        })
        .catch(err => console.log(err));
};

const approve_user = (req: Request, res: Response, next: NextFunction) => {
    const my_query = {entry_no: req.body.entry_no};
    req.body.query = my_query;
    res.locals.no_send = true;
    all_query(req, res, next)
    .then((data: any) => {
        req.body = {};
        req.body.privelege_level = "Approved_User";
        req.body.created_by = res.locals.logged_user_id;
        req.body.updated_by = res.locals.logged_user_id;
        req.params.id = data[0]["_id"];
        update(req, res, next)
        .then((fresh_data: any) => {
            res.json(createResponse("Approved User", fresh_data));
        })
        .catch((err: any) => {
            res.json(createResponse("Error while registering", err));
        });
    })
    .catch((err: any) => {
        res.json(createResponse("Error while registering", err));
    });
};

// User should be authenticated before this
// WARNING: Deletes the user.
// Should a check be added to see if the user is not approved?
const reject_user = (req: Request, res: Response, next: NextFunction) => {
    if (res.locals.logged_user_id == undefined) {
        return next(createError(500, "User not authenticated", "User id not found"));
    }

    if (req.body.user_id == undefined) {
        return next(createError(400, "User id not supplied", ""));
    }

    User.findByIdAndDelete(req.body.user_id)
        .then(_ => res.send("User rejected successfully"))
        .catch(err => next(err));
}

const reject_all = (req: Request, res: Response, next: NextFunction) => {
    if (res.locals.logged_user_id == undefined) {
        return next(createError(500, "User not authenticated", "User id not found"));
    }

    req.body.query = {privelege_level: "Unapproved_User"};
    res.locals.no_send = true;
    delete_query(req, res, next)
        .then(() => res.send("All unapproved users rejected successfully"))
        .catch(err => next(err));
}

const update_record = (req: Request, res: Response, next: NextFunction) => {
    const my_query = {entry_no: req.params.id};
    console.log(my_query);

    req.body.query = my_query;
    res.locals.no_send = true;
    all_query(req, res, next)
    .then((data: any) => {
        req.body.query = {};
        req.body.updated_by = res.locals.logged_user_id;
        req.params.id = data[0]["_id"];
        update(req, res, next)
        .then((fresh_data: any) => {
            res.json(createResponse("Record updated", fresh_data));
        })
        .catch((err: any) => {
            res.json(createResponse("Error while registering", err));
        });
    })
    .catch((err: any) => {
        res.json(createResponse("Error while registering", err));
    });
};

/* const chk_pswd = (req: Request, res: Response, next: NextFunction) => {
    bcrypt.compare(ADMIN_SECRET, req.body.password, function(err: any, _: any) {
        if (err) {
            console.log(err)
            res.json(createResponse("You are not authorised to perform this action. Your details have been reported", ""));
        };
        next();
    });
}; */

const delete_record = (req: Request, res: Response, next: NextFunction) => {
    res.locals.no_send = true;
    all_delete(req, res, next)
    .then((_: any) => {
        res.json(createResponse("Records deleted", ""));
    })
    .catch((err: any) => {
        res.json(createResponse("Error while deleting", err));
    });
};

// Get all docs with display_on_website true
const all_website = (req: Request, res: Response, next: NextFunction) => {
    req.body.query = {display_on_website: true};
    all_query(req, res, next);
}

/*
* Must be called after a call to checkAdmin. Relies on property res.locals.checkAdmin
* to be present for admin access.
*/
const isSameUserOrAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (res.locals.isAdmin === undefined) {
        return next(createError(500, "Internal error", "res.locals.isAdmin property not set"));
    }

    if (res.locals.isAdmin) return next();
    else if(res.locals.logged_user == req.params.id) return next()
    else{
      next(createError(401,'Unauthorized','User is unauthorized for this endpoint.'))
    }
};

router.post('/testAdmin/', isAdmin, (_0: Request, res: Response, _2: NextFunction) => {
    res.send("You are a admin, Harry");}
);
router.post('/testAdminSelf/:id', checkAdmin, isSameUserOrAdmin, (_0: Request, res: Response, _2: NextFunction) => {
    res.send("You were looking for yourself, Harry. Or you are an admin idk");}
);

router.post('/deleteAll/', isAdmin, delete_record);
router.post('/', create);
router.put('/:id', checkAdmin, isSameUserOrAdmin, update_record);
router.post("/login", login);
router.post("/changePassword", checkToken, changePassword);
router.post("/approve", isAdmin, approve_user);
router.post("/reject", isAdmin, reject_user);
router.post("/rejectAll", isAdmin, reject_all);
router.get("/getAll/", all_website);
router.get("/getAllDB", checkToken, all);
router.get("/query/", all_query);
router.post("/register", pswd_hash, register);
router.get("/unapproved", getUnapproved);

export default router;