# Profile Features - Quick Reference

## What's New

✅ **Avatar Upload**
- Click avatar image to upload picture
- Supports JPG, PNG, GIF, WebP
- Max 5MB file size
- Shows preview before saving

✅ **Bio & Profile Fields**
- Bio: 160 characters max
- Location: 50 characters
- Website: Full URL (optional)
- Username: 2-30 characters
- Private account toggle

✅ **New API Endpoints**
```
/api/profile/me                - Your full profile
/api/profile/:userId           - Public profile
/api/profile/:userId/stats     - Profile stats
/api/profile/recommendations   - Users to follow
/api/profile/search?q=xxx      - Search profiles
```

✅ **Backend Services**
- Profile service with validation
- Profile-specific routes
- Completion scoring system
- Recommended users algorithm
- Search functionality

✅ **Frontend Components**
- Enhanced edit profile modal
- Avatar file picker
- Profile UI library (cards, grids, summaries)
- Event listeners for interactions

## How to Use

### Edit Your Profile (Frontend)
1. Click "Edit Profile" button
2. Click avatar to upload picture
3. Edit username, bio, location, website
4. Toggle private account if desired
5. Click "Save Profile"

### Get User Profile (API)
```bash
# Your profile
curl -H "Authorization: Bearer TOKEN" \
     http://localhost:3000/api/profile/me

# Another user's profile
curl http://localhost:3000/api/profile/user123
```

### Update Profile (API)
```bash
curl -X PUT \
     -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "username": "newname",
       "bio": "New bio",
       "location": "NYC",
       "website": "https://example.com",
       "avatar": "data:image/jpeg;base64,..."
     }' \
     http://localhost:3000/api/profile/me
```

### Search Profiles (API)
```bash
curl "http://localhost:3000/api/profile/search?q=john&limit=10"
```

### Get Profile Recommendations (API)
```bash
curl -H "Authorization: Bearer TOKEN" \
     "http://localhost:3000/api/profile/recommendations?limit=10"
```

## Files Modified

### Frontend
- `client/index.html` - Enhanced edit profile modal
- `client/app.js` - Avatar upload handler, profile form submission
- `client/profileUI.js` - New UI component library

### Backend
- `server/routes/users.js` - Enhanced update profile
- `server/routes/settings.js` - Enhanced settings endpoint
- `server/routes/profile.js` - New dedicated profile routes
- `server/services/profile.js` - New profile service
- `server/routes/index.js` - Mounted profile routes

## Key Fields

| Field | Limit | Type | Required |
|-------|-------|------|----------|
| Username | 2-30 chars | Text | Yes |
| Bio | 0-160 chars | Text | No |
| Location | 0-50 chars | Text | No |
| Website | 0-200 chars | URL | No |
| Avatar | 5MB max | Image | No |
| Private | - | Boolean | No |

## Validation

✅ Username uniqueness checked  
✅ Email re-verified on change  
✅ URL format validated  
✅ Character length enforced  
✅ File size limits checked  
✅ XSS protection on all fields  

## Profile Completion Score

Calculated based on:
- Avatar (25%)
- Bio (25%)
- Location (25%)
- Website (15%)
- Followers (5%)
- Posts (5%)

## Testing

### 1. Upload Avatar
```bash
# Open browser DevTools console
document.getElementById('editProfileBtn').click();
document.getElementById('editAvatarPreview').click();
# Select an image file
```

### 2. Edit Profile
```bash
# In console
const form = document.getElementById('editProfileForm');
form.querySelector('#editUsername').value = 'newname';
form.querySelector('#editBio').value = 'My bio';
form.submit();
```

### 3. Test API
```bash
# Get profile
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/profile/me

# Update profile
curl -X PUT \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"bio":"Test bio","location":"NYC"}' \
     http://localhost:3000/api/profile/me
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers

## Performance Notes

- Avatar stored as base64 (no extra requests)
- Profiles cached in memory
- Search optimized for fast queries
- Profile completion calculated once on load

## Next Steps (Optional)

- [ ] Avatar cropping tool
- [ ] Profile background image
- [ ] Verified badge system
- [ ] Profile themes
- [ ] Profile analytics
- [ ] Import from other platforms
- [ ] QR code for profile
- [ ] Profile highlights

---

**All profile features are live and ready to use!** 🎉
