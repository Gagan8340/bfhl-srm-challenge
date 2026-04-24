# BFHL · Node Hierarchy Explorer
**SRM Full Stack Engineering Challenge**

A production-ready full-stack application that processes graph hierarchical relationships through a robust REST API and visualizes them in a premium web interface.

## 🚀 Live Demo
- **Frontend & API**: [Your Hosted URL Here]
- **API Endpoint**: `POST /bfhl`

## 🛠️ Tech Stack
- **Backend**: Node.js, Express.js
- **Frontend**: Vanilla HTML5, CSS3 (Modern UI), JavaScript (ES6+)
- **Deployment**: Optimized for Vercel / Render / Railway

## 📂 Project Structure
```text
.
├── index.js           # Main Express server (API + Static Serving)
├── public/            # Frontend assets
│   └── index.html     # Single-page explorer app
├── package.json       # Project dependencies
└── vercel.json        # Vercel deployment configuration
```

## ⚙️ Features
- **Validation**: Strict `X->Y` pattern matching for nodes.
- **Deduplication**: Intelligent handling of repeated edges.
- **Graph Logic**: 
  - Multi-parent resolution (First encounter wins).
  - Component grouping.
  - DFS-based cycle detection.
  - Tree construction with depth calculation.
- **Premium UI**: 
  - Real-time tree visualization (CLI-style branch rendering).
  - Summary dashboard.
  - Raw JSON inspector.
  - Error handling with feedback.

## 💻 Local Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Server**:
   ```bash
   npm start
   ```
   The application will be available at `http://localhost:3000`.

3. **Usage**:
   - Enter node relationships (e.g., `A->B, B->C`) in the text area.
   - Click **Process Nodes** to see the results.

## 🧪 API Specification

### `POST /bfhl`
Processes an array of node strings.

**Request Body**:
```json
{
  "data": ["A->B", "A->C", "B->D"]
}
```

**Response Fields**:
- `user_id`: Unique identifier (`fullname_ddmmyyyy`).
- `email_id`: Registered college email.
- `college_roll_number`: Student roll number.
- `hierarchies`: Array of processed tree/cycle objects.
- `invalid_entries`: List of non-matching strings.
- `duplicate_edges`: List of repeated edges.
- `summary`: Total counts and largest tree root.

## 🛡️ Identity
- **User ID**: `gagan_24042026`
- **Email**: `gagan.s@college.edu`
- **Roll Number**: `21CS1001`
