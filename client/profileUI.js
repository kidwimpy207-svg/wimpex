/**
 * Profile UI Component
 * Handles all profile-related UI functionality
 */

const ProfileUI = {
  /**
   * Render a user profile card
   */
  renderProfileCard(user, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const html = `
      <div class="profile-card" style="max-width:400px;border:1px solid #ddd;border-radius:12px;padding:20px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        <!-- Avatar -->
        <div style="text-align:center;margin-bottom:20px;">
          <img src="${user.avatar || 'https://i.pravatar.cc/150?u=' + (user.email || 'user')}" 
               alt="${user.username}" 
               style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:3px solid gold;">
        </div>

        <!-- Username -->
        <h2 style="text-align:center;margin:10px 0;font-size:24px;font-weight:bold;">
          ${user.username}
          ${user.verified ? '<span style="color:gold;margin-left:5px;">✓</span>' : ''}
        </h2>

        <!-- Bio -->
        ${user.bio ? `<p style="text-align:center;color:#666;margin:10px 0;">${user.bio}</p>` : ''}

        <!-- Location & Website -->
        <div style="text-align:center;color:#888;font-size:14px;margin:10px 0;">
          ${user.location ? `<div><strong>📍</strong> ${user.location}</div>` : ''}
          ${user.website ? `<div><strong>🔗</strong> <a href="${user.website}" target="_blank" style="color:gold;text-decoration:none;">${user.website}</a></div>` : ''}
        </div>

        <!-- Stats -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:20px 0;text-align:center;">
          <div>
            <div style="font-size:20px;font-weight:bold;">${user.postCount || 0}</div>
            <div style="font-size:12px;color:#666;">Posts</div>
          </div>
          <div>
            <div style="font-size:20px;font-weight:bold;">${user.followerCount || 0}</div>
            <div style="font-size:12px;color:#666;">Followers</div>
          </div>
          <div>
            <div style="font-size:20px;font-weight:bold;">${user.followingCount || 0}</div>
            <div style="font-size:12px;color:#666;">Following</div>
          </div>
        </div>

        <!-- Buttons -->
        <div style="display:flex;gap:10px;">
          <button class="follow-btn gold-btn" style="flex:1;padding:10px;" data-user-id="${user.userId}">Follow</button>
          <button class="message-btn gold-btn" style="flex:1;padding:10px;background:#333;" data-user-id="${user.userId}">Message</button>
        </div>

        <!-- Profile Completion -->
        ${user.profileComplete ? '<div style="text-align:center;margin-top:10px;color:green;font-size:12px;">✓ Profile Complete</div>' : ''}
        ${user.privateAccount ? '<div style="text-align:center;margin-top:5px;color:#888;font-size:12px;">🔒 Private Account</div>' : ''}
      </div>
    `;

    container.innerHTML = html;
  },

  /**
   * Render compact profile summary
   */
  renderProfileSummary(user, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const html = `
      <div class="profile-summary" style="display:flex;align-items:center;gap:15px;padding:10px;border-radius:8px;background:#f5f5f5;">
        <img src="${user.avatar || 'https://i.pravatar.cc/80?u=' + (user.email || 'user')}" 
             alt="${user.username}" 
             style="width:60px;height:60px;border-radius:50%;object-fit:cover;">
        
        <div style="flex:1;">
          <div style="font-weight:bold;font-size:14px;">${user.username}</div>
          <div style="font-size:12px;color:#666;">${user.bio || 'No bio'}</div>
          <div style="font-size:11px;color:#999;">📍 ${user.location || 'No location'}</div>
        </div>

        <button class="quick-follow-btn gold-btn" style="padding:8px 16px;font-size:12px;" data-user-id="${user.userId}">Follow</button>
      </div>
    `;

    container.innerHTML = html;
  },

  /**
   * Render profile grid (multiple profiles)
   */
  renderProfileGrid(users, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:15px;">';
    
    users.forEach(user => {
      html += `
        <div class="profile-grid-item" style="border:1px solid #ddd;border-radius:8px;padding:15px;text-align:center;cursor:pointer;transition:all 0.3s;background:#fff;" data-user-id="${user.userId}">
          <img src="${user.avatar || 'https://i.pravatar.cc/100?u=' + (user.email || 'user')}" 
               alt="${user.username}" 
               style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin-bottom:10px;">
          <h4 style="margin:5px 0;font-size:14px;">${user.username}</h4>
          <p style="font-size:12px;color:#666;margin:5px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${user.bio || 'No bio'}</p>
          <div style="font-size:11px;color:#999;margin:5px 0;">${user.followerCount || 0} followers</div>
          <button class="follow-btn gold-btn" style="width:100%;padding:6px;font-size:12px;margin-top:8px;" data-user-id="${user.userId}">Follow</button>
        </div>
      `;
    });
    
    html += '</div>';
    container.innerHTML = html;
  },

  /**
   * Render profile completion widget
   */
  renderCompletionWidget(score, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const color = score >= 80 ? 'green' : score >= 50 ? 'orange' : 'red';
    const tips = [];
    
    if (score < 100) {
      if (score < 25) tips.push('Add a profile picture');
      if (score < 50) tips.push('Write a compelling bio');
      if (score < 75) tips.push('Add your location');
      if (score < 100) tips.push('Share your website');
    }

    const html = `
      <div class="completion-widget" style="padding:15px;border-radius:8px;background:#f9f9f9;border-left:4px solid ${color};">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <span style="font-weight:bold;">Profile Completeness</span>
          <span style="font-size:20px;font-weight:bold;color:${color};">${score}%</span>
        </div>
        <div style="background:#ddd;height:8px;border-radius:4px;overflow:hidden;margin-bottom:10px;">
          <div style="background:${color};height:100%;width:${score}%;transition:width 0.3s;"></div>
        </div>
        ${tips.length > 0 ? `
          <div style="font-size:12px;color:#666;">
            <strong>To complete your profile:</strong>
            <ul style="margin:5px 0;padding-left:20px;">
              ${tips.map(tip => `<li>${tip}</li>`).join('')}
            </ul>
          </div>
        ` : '<div style="font-size:12px;color:green;font-weight:bold;">Your profile is complete!</div>'}
      </div>
    `;

    container.innerHTML = html;
  },

  /**
   * Attach event listeners to profile components
   */
  attachEventListeners() {
    // Follow buttons
    document.addEventListener('click', async (e) => {
      if (e.target.classList.contains('follow-btn') || e.target.classList.contains('quick-follow-btn')) {
        const userId = e.target.dataset.userId;
        if (!userId) return;
        
        try {
          const res = await fetch(`/api/friends/follow/${userId}`, {
            method: 'POST',
            headers: { 'authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (res.ok) {
            e.target.textContent = 'Following';
            e.target.style.opacity = '0.7';
            e.target.disabled = true;
          }
        } catch (err) {
          console.error('Error following user:', err);
        }
      }

      // Message buttons
      if (e.target.classList.contains('message-btn')) {
        const userId = e.target.dataset.userId;
        if (!userId) return;
        // Trigger message modal or navigate to chat
        window.openMessageModal?.(userId);
      }

      // Profile grid items - navigate to profile
      if (e.target.closest('.profile-grid-item')) {
        const userId = e.target.closest('.profile-grid-item').dataset.userId;
        if (userId) {
          window.location.hash = `#profile/${userId}`;
        }
      }
    });
  }
};

// Export for Node.js (if used in SSR)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProfileUI;
}
