📱 WhatsApp Clone - A Real-Time Chat Simulation
This project is a full-stack application that simulates a WhatsApp Web chat interface. It processes and displays real-time chat data from simulated webhook payloads, providing a clean and responsive user experience. The application demonstrates a well-structured backend for data processing and a dynamic frontend built with real-time updates in mind.

🚀 Live Demo
The complete application is hosted and publicly accessible. You can view the live demo here:

https://whatsapp-clone-assigment.onrender.com

✨ Features
WhatsApp Web-Like UI: A clean and intuitive user interface designed to mimic the look and feel of WhatsApp Web.

Real-Time Conversations: The interface updates automatically with new messages and status changes, thanks to a WebSocket implementation using Socket.IO.

Message Processing: A server-side script and API endpoints process simulated webhook payloads to manage message data.

Conversation Grouping: Messages are neatly organized into conversations, grouped by the wa_id (WhatsApp ID).

Message Display: All messages are displayed in a familiar chat bubble format, including timestamps and status indicators (sent, delivered, read).

Send Message (Demo): Users can type and send messages, which are instantly displayed in the chat and saved to the database. No external messages are actually sent, as per the project requirements.

Responsive Design: The application is optimized for use on both desktop and mobile devices.

💻 Tech Stack
Backend: Node.js, Express.js

Database: MongoDB Atlas with Mongoose ODM

Real-time Communication: Socket.IO

Frontend: HTML, CSS, JavaScript

Deployment: Render
