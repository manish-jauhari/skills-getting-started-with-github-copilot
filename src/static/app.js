document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper: escape HTML to avoid injection
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (s) => {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[s];
    });
  }

  // Helper: get initials from an email or name-like string
  function getInitials(s) {
    if (!s) return "?";
    const local = s.split("@")[0];
    const parts = local.split(/[\.\-_ ]+/).filter(Boolean);
    if (parts.length === 0) return local.charAt(0).toUpperCase() || "?";
    const initials = parts.slice(0, 2).map(p => p.charAt(0).toUpperCase()).join("");
    return initials;
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset select options to avoid duplicates
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const participants = Array.isArray(details.participants) ? details.participants : [];
        const spotsLeft = details.max_participants - participants.length;

        // Build participants HTML (include unregister/delete button)
        let participantsHtml = '<ul class="participants-list">';
        if (participants.length === 0) {
          participantsHtml += '<li class="no-participants">No participants yet</li>';
        } else {
          participants.forEach((p) => {
            const initials = getInitials(p);
            participantsHtml += `<li>
                <div style="display:flex;align-items:center;">
                  <span class="participant-badge">${escapeHtml(initials)}</span>
                  <span class="participant-email">${escapeHtml(p)}</span>
                </div>
                <button class="participant-delete" data-activity="${escapeHtml(name)}" data-email="${escapeHtml(p)}" title="Unregister">✖</button>
              </li>`;
          });
        }
        participantsHtml += '</ul>';

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <strong>Participants:</strong>
            ${participantsHtml}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Attach handlers to unregister buttons inside this activity card
        activityCard.querySelectorAll('.participant-delete').forEach((btn) => {
          btn.addEventListener('click', async (e) => {
            const email = btn.dataset.email;
            const activityName = btn.dataset.activity;
            const ok = confirm(`Unregister ${email} from ${activityName}?`);
            if (!ok) return;
            try {
              const resp = await fetch(`/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
              const result = await resp.json();
              if (!resp.ok) {
                alert(result.detail || 'Failed to unregister participant');
              } else {
                // Refresh activities list to reflect removal
                await fetchActivities();
              }
            } catch (err) {
              console.error('Error unregistering participant:', err);
              alert('Failed to unregister participant.');
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities so the newly registered participant appears without a manual reload
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
