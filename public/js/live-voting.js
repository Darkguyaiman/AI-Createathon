(() => {
  const votingRoot = document.querySelector('[data-live-voting-board]');
  const leaderboardRoot = document.querySelector('[data-live-leaderboard]');

  if (!votingRoot && !leaderboardRoot) {
    return;
  }

  const socket = window.io ? window.io() : null;
  if (!socket) {
    return;
  }

  const escapeHTML = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const renderRankBadge = (index) => {
    if (index === 0) {
      return '<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white brutal-border-sm"><i class="fa-solid fa-trophy text-sm"></i></span>';
    }
    if (index === 1) {
      return '<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-cream-dark text-on-surface brutal-border-sm font-bold">2</span>';
    }
    if (index === 2) {
      return '<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-cream-dark/50 text-on-surface brutal-border-sm font-bold">3</span>';
    }
    return `#${index + 1}`;
  };

  const updateVotingBoard = (snapshot) => {
    if (!votingRoot || !snapshot) return;

    const totalVotesNode = document.querySelector('[data-live-total-votes]');
    if (totalVotesNode) {
      totalVotesNode.textContent = snapshot.totalVotes;
    }

    const rows = new Map(
      Array.from(votingRoot.querySelectorAll('[data-group-id]')).map(row => [Number(row.dataset.groupId), row])
    );

    snapshot.groups.forEach(group => {
      const row = rows.get(Number(group.id));
      if (!row) return;

      const voteCount = row.querySelector('[data-live-vote-count]');
      const votePercent = row.querySelector('[data-live-vote-percent]');
      const bar = row.querySelector('[data-live-bar]');

      if (voteCount) voteCount.textContent = group.vote_count;
      if (votePercent) votePercent.textContent = group.percentage;
      if (bar) {
        bar.style.width = `${group.bar_width}%`;
        if (group.bar_width > 0) {
          bar.classList.remove('border-r-0');
          bar.classList.add('border-r-4');
        } else {
          bar.classList.remove('border-r-4');
          bar.classList.add('border-r-0');
        }
      }
    });
  };

  const updateLeaderboard = (snapshot) => {
    if (!leaderboardRoot || !snapshot) return;

    const totalVotesNode = document.querySelector('[data-live-total-votes]');
    if (totalVotesNode) {
      totalVotesNode.textContent = snapshot.totalVotes;
    }

    const tbody = leaderboardRoot.querySelector('[data-live-leaderboard-body]');
    if (!tbody) return;

    if (!snapshot.leaderboard || snapshot.leaderboard.length === 0) {
      tbody.innerHTML = '';
      return;
    }

    tbody.innerHTML = snapshot.leaderboard.map((item, index) => `
      <tr class="hover:bg-background/40 transition-colors">
        <td class="py-5 px-4 font-black text-on-surface text-center brutal-border-sm border-b-0 border-l-0">${renderRankBadge(index)}</td>
        <td class="py-5 px-4 brutal-border-sm border-b-0">
          <div class="flex items-center gap-3.5">
            <img src="${escapeHTML(item.logo_path)}" alt="" class="w-10 h-10 brutal-border-sm object-cover bg-white">
            <div>
              <p class="font-sans font-black uppercase text-base text-on-surface tracking-tight leading-none">${escapeHTML(item.name)}</p>
              <p class="text-[10px] text-on-surface/50 font-bold uppercase tracking-wider mt-1.5">ID: #${escapeHTML(item.id)} | ${escapeHTML(item.member_count)} Member${Number(item.member_count) !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </td>
        <td class="py-5 px-4 text-center brutal-border-sm border-b-0">
          <div class="font-black text-base text-on-surface" data-live-vote-count>${escapeHTML(item.vote_count)}</div>
          <div class="text-[9px] text-on-surface/50 font-bold uppercase mt-1.5">${escapeHTML(item.public_pct)}% weight</div>
        </td>
        <td class="py-5 px-4 text-center brutal-border-sm border-b-0">
          <div class="font-black text-base text-on-surface">${escapeHTML(item.judge_avg_raw)} / 30</div>
          <div class="text-[9px] text-on-surface/50 font-bold uppercase mt-1.5">${escapeHTML(item.judge_pct)}% weight</div>
        </td>
        <td class="py-5 px-4 text-center font-black text-lg text-primary brutal-border-sm border-b-0 border-r-0">${escapeHTML(item.combined_score)} / 100</td>
      </tr>
    `).join('');
  };

  socket.on('voting:update', snapshot => {
    updateVotingBoard(snapshot);
    updateLeaderboard(snapshot);
  });
})();
