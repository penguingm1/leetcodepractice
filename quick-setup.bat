@echo off
echo 🚀 LeetCode Practice App - Quick Setup
echo ======================================

echo.
echo 📦 Installing Node.js dependencies...
npm install

echo.
echo 🔧 Creating .env file from template...
if not exist .env (
    copy env.example .env
    echo ✅ .env file created. Please edit it with your PostgreSQL password.
) else (
    echo ⚠️  .env file already exists.
)

echo.
echo 🗄️  Setting up database...
npm run setup-db

echo.
echo 🎉 Setup complete!
echo.
echo 📝 Next steps:
echo 1. Edit .env file with your PostgreSQL password
echo 2. Run: npm run dev
echo 3. Open http://localhost:3001 in your browser
echo.
pause 