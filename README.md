
## Dynamic WebApp Overview

This project is a **full-stack Dynamic Task Manager Web Application** built using **Frontend + Backend + Database**.

The **frontend** is made using **HTML, CSS, and JavaScript**, where users can:

* Sign up and log in
* Add tasks
* Select a due date using a calendar
* Delete tasks
* Use an “AI Improve” button to improve task text

The **backend** is built using **Node.js and Express.js**, which provides API routes for:

* User authentication (Signup/Login)
* Task operations (Add/View/Delete)
* AI Improve logic

Authentication is implemented using:

* **bcrypt** for secure password hashing
* **JWT tokens** for login session handling and protected APIs

All user data and tasks are stored permanently in a **PostgreSQL database**, so tasks remain saved even after restarting the server.

For cloud deployment, the project can be hosted using AWS services:

* **Frontend** on **Amazon S3 (Static Hosting)** (optional CloudFront for HTTPS)
* **Backend** on **AWS EC2** (Node server running online)
* **Database** on **Amazon RDS PostgreSQL**
