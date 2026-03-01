# Quick Import Guide

## Files to Import

1. **Medonix_Complete_API.postman_collection.json** (or **Zimmil_Complete_API.postman_collection.json**) - Complete API collection
2. **Medonix_Backend_Environment.postman_environment.json** (or **Zimmil_Backend_Environment.postman_environment.json**) - Environment variables

**Per-Controller collections (optional):** You can also import individual controller collections for full URL, request, and response details:
- **Category_Controller.postman_collection.json** - Category API
- **Auth_Controller.postman_collection.json** - Register & Login
- **Client_Controller.postman_collection.json** - Client CRUD & list
- **Product_Controller.postman_collection.json** - Product CRUD, search, export PDF
- **RefreshToken_Controller.postman_collection.json** - Refresh token

## Quick Setup (3 Steps)

### Step 1: Import Collection
- Open Postman
- Click **Import** → Select `Zimmil_Complete_API.postman_collection.json`

### Step 2: Import Environment
- Click **Import** → Select `Zimmil_Backend_Environment.postman_environment.json`
- Select **Zimmil Backend Environment** from the environment dropdown (top right)

### Step 3: Login & Auto-Save Token
- Go to **Authentication** → **Login**
- Update email/password and click **Send**
- Token is automatically saved! ✅
- All other APIs will now work automatically

## Authentication

✅ All APIs (except Login/Register) have Bearer token authentication configured  
✅ Token is automatically saved after login  
✅ No manual token copying needed  

## Environment Variables

- `baseUrl` - Your backend URL (default: http://localhost:8080)
- `token` - JWT token (auto-filled after login)
- `access_token` - Same as token (for compatibility)

You can update `baseUrl` in the environment if your backend runs on a different port/domain.

