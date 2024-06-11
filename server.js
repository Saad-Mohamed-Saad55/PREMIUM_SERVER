const cookieParser = require('cookie-parser');
const {decode} = require("jsonwebtoken");
const multer = require('multer');
const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const fs = require('fs')
// const route = require('./routes/router');
const conn = require('./config/db');

const salt = 10;

const app = express();
app.use(express.json());
app.use(cors({
    origin: ["http://localhost:3000"],
    methods: ["POST", "GET", 'DELETE', 'PUT'],
    credentials: true
}));
app.use(cookieParser());
app.use(bodyParser.json())
// app.use(route);

const verifyUser = (req, res, next) => {
    const token = req.cookies.token; // Corrected to req.cookies
    if (!token) return res.json({ Error: "You are not authenticated" });
    jwt.verify(token, "jwt-secret-key", (err, decoded) => {
        if (err) {
            return res.json({ Error: "Token is not valid" });
        } else {
            req.user = decoded; // Attach decoded payload to req.user
            next();
        }
    });
};

app.get('/', verifyUser, (req, res) => {
    const { firstName, role } = req.user;
    return res.json({ Status: "Success", firstName, role });
});

// SIGNE IN
app.post('/signIn', (req, res) => {
    const { email, password } = req.body;

    conn.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) return res.json({ Error: "Login error" });
        if (results.length > 0) {
            bcrypt.compare(password.toString(), results[0].password, (err, response) => {
                if (err) return res.json({ Error: "Password compare error" });
                if (response) {
                    const { first_name: firstName, role: role } = results[0]; // Ensure correct property name
                    // console.log("User firstName:", firstName); // Debugging statement
                    const token = jwt.sign({ firstName, role }, "jwt-secret-key", { expiresIn: "1d" });
                    res.cookie('token', token);
                    return res.json({ Status: "Success" });
                } else {
                    return res.json({ Error: "Password not matched" });
                }
            });
        } else {
            return res.json({ Error: "No email existed" });
        }
    });
});

// SING OUT
app.get('/signOut', (req, res) => {
    res.clearCookie('token');
    return res.json({ Status: "Success" });
})










// Middleware to authenticate user
const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(401).json({ message: 'Access denied' });
    }

    jwt.verify(token, 'secret_key', (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Invalid token' });
        }
        req.user = decoded;
        next();
    });
};

// Middleware to check if the user is an admin
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    next();
};






// USERS

// GET USER BY ID
app.get("/users/:id", (req, res) => {
    const userID = req.params.id
    const sql = "SELECT * FROM users";
    conn.query(sql, (err, result)=>{
        if (err) res.json({message:"Server Error"});
        return res.json(result);
    });
});


// GET ALL USERS (FOR ADMIN)
app.get("/users", (req, res) => {
    const sql = "SELECT * FROM users";
    conn.query(sql, (err, result)=>{
        if (err) res.json({message:"Server Error"});
        return res.json(result);
    });
});


// COURSES
// GET ALL COURSES AND INSTRUCTORS
app.get("/instructor-courses", (req, res)=>{
    const sql = "SELECT U.first_name, U.last_name, U.email, C.course_code, C.course_name FROM users AS U INNER JOIN instructor_courses AS IC ON U.id = IC.instructor_id INNER JOIN courses AS C ON IC.course_id = C.course_code";
    conn.query(sql, (err, result)=>{
        if (err) return res.json({Error: "Inserting data Error in server"});
        return res.json(result);
    });
});


// Assuming you have a chapters table with a course_id foreign key
app.get("/chapters/:courseId", (req, res) => {
    const courseId = req.params.course_code; // Get course ID from route parameter

    const sql = "SELECT * FROM chapters WHERE course_id = ?"; // Query chapters for specific course

    conn.query(sql, [courseId], (err, result) => {
        if (err) return res.json({ message: "Server Error" });
        return res.json(result); // Send chapters data as JSON response
    });
});

// UPLOADING PDF FILES TO DB
const upload = multer({ dest: 'uploads/' });  // Configure upload destination (optional)

app.post('/upload-chapter', upload.single('pdfFile'), (req, res) => {
    const pdfBuffer = fs.readFileSync(req.file.path);  // Read uploaded file as buffer

    const sql = 'INSERT INTO chapters (chapter_name, chapter_title, course_id, pdf_blob) VALUES (?, ?, ?, ?)';
    const values = [req.body.chapterName, req.body.chapterTitle, req.body.courseId, pdfBuffer];

    conn.query(sql, values, (err, result) => {
        if (err) return res.json({ error: err.message });
        return res.json({ message: 'Chapter uploaded successfully!' });
    });
});


// GET ALL DEPARTMENTS
app.get("/api/departments", (req, res) => {
    const sql = "SELECT * FROM departments";
    conn.query(sql, (err, result)=>{
        if (err) res.json({message:"Server Error"});
        return res.json(result);
    });
});


// GET ALL ENROLLMENTS
app.get("/enrollments", (req, res) => {
    const sql = "SELECT * FROM enrollments";
    conn.query(sql, (err, result)=>{
        if (err) res.json({message:"Server Error"});
        return res.json(result);
    });
});

app.get("/instructors-courses", (req, res)=>{
    const sql = "SELECT * FROM instructors_courses";
    conn.query(sql, (err, result)=>{
        if (err) res.json({ message: "Server Error" });
        return res.json(result);
    })
})


// ADD ACCOUNT (ADMIN VIEW)
app.post("/add-account", (req, res) => {
    const sql = "INSERT INTO users (first_name, middle_name, last_name, email, password, role, department_id) VALUES (?)";
    bcrypt.hash(req.body.password.toString(), salt, (err, hash) => {
        if (err) {
            console.error("Error for hashing password:", err);
            return res.json({ Status: "Error", Error: "Error for hashing password" });
        }
        const values = [
            req.body.firstName,
            req.body.middleName,
            req.body.lastName,
            req.body.email,
            hash,
            req.body.role,
            req.body.departmentID
        ];
        conn.query(sql, [values], (err, result) => {
            if (err) {
                console.error("Inserting data Error in server:", err);
                return res.json({ Status: "Error", Error: "Inserting data Error in server" });
            }
            return res.json({ Status: "Success" });
        });
    });
});


// UPDATE ACCOUNT (ADMIN VIEW)
app.post("/update-account", (req, res) => {
    const firstName = req.body.newFirstName;
    const middleName = req.body.newMiddleName;
    const lastName = req.body.newLastName;
    const email = req.body.newEmail;
    const password = req.body.newPassword;
    const id = req.body.userID;
    const sql = "UPDATE users SET first_name=?, middle_name=?, last_name=?, email=?, password=? WHERE id=?";
    conn.query(sql, [firstName, middleName, lastName, email, password, id], (err, result) => {
        if (err) return res.json({Error: "Deleting data Error in server"});
        return res.json({Status: "Success"});
    })
});

// DELETE ACCOUNT (ADMIN VIEW)
app.post("/delete-account", authenticate, isAdmin, (req, res) => {
    const id = req.body.userID;
    const sql = "DELETE FROM users WHERE id=?";
    conn.query(sql, [id], (err, result) => {
        if (err) return res.json({Error: "Deleting data Error in server"});
        return res.json({Status: "Success"});
    });
});


// ADMIN VIEW ADDING & REMOVING COURSE , STUDENTS & INSTRUCTORS

app.get('/api/courses', (req, res) => {
    const departmentId = req.query.department_id;
    const query = `
      SELECT *
      FROM courses c
      INNER JOIN departments_courses dc ON c.course_code = dc.course_id
      WHERE dc.department_id = ?
    `;
    conn.query(query, [departmentId], (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

app.post('/api/courses', (req, res) => {
    const { departmentId, courseCode, courseName, description } = req.body;
    console.log('Received course data:', { departmentId, courseCode, courseName, description });

    if (!departmentId || !courseCode || !courseName || !description) {
        console.error('Missing required fields:', { departmentId, courseCode, courseName, description });
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert into courses table
    const courseInsertQuery = 'INSERT INTO courses (course_code, course_name, description) VALUES (?, ?, ?)';
    conn.query(courseInsertQuery, [courseCode, courseName, description], (err, result) => {
        if (err) {
            console.error('Error inserting course:', err);
            res.status(500).json({ error: 'Error inserting course' });
            return;
        }

        // Insert into departments_courses table
        const departmentsCoursesInsertQuery = 'INSERT INTO departments_courses (department_id, course_id) VALUES (?, ?)';
        conn.query(departmentsCoursesInsertQuery, [departmentId, courseCode], (err) => {
            if (err) {
                console.error('Error inserting course-department relationship:', err);
                res.status(500).json({ error: 'Error inserting course-department relationship' });
                return;
            }

            res.status(201).json({ message: 'Course added successfully' });
        });
    });
});



app.delete('/api/courses/:course_code', (req, res) => {
    const course_code = req.params.course_code;
    const query = 'DELETE FROM courses WHERE course_code = ?';
    conn.query(query, [course_code], (err, result) => {
        if (err) throw err;
        res.sendStatus(204);
    });
});

app.post('/api/instructors-courses', (req, res) => {
    const { instructorEmail, courseCodes } = req.body;
    const query = 'SELECT id FROM users WHERE email = ?';
    conn.query(query, [instructorEmail], (err, results) => {
        if (err) throw err;
        const instructorId = results[0].id;
        const values = courseCodes.map(courseCode => [instructorId, courseCode]);
        const insertQuery = 'INSERT INTO instructors_courses (instructor_id, course_id) VALUES ?';
        db.query(insertQuery, [values], (err, result) => {
            if (err) throw err;
            res.sendStatus(200);
        });
    });
});





app.listen(4001, ()=>{
    console.log("SERVER IS RUNNING...");
})