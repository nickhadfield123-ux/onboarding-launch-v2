'use client';

import React, { useState } from 'react';

interface Member {
  name: string;
  sub: string;
  possibility: string;
  rizz_ctx: string;
  thread: Array<{ from: string; text: string }>;
}

const members: Record<string, Member> = {
  joe: {
    name: 'Joseph Brand',
    sub: 'Amadena Terra · CatastroIntel',
    possibility: 'Met in Sacred Valley Dec 2024. Both running projects deeply aligned with Resourceful — Amadena Terra and CatastroIntel. Likely founding member, partner, and first person to see the platform. High-trust relationship already exists.',
    rizz_ctx: "This is not an orientation — it's a continuation. He's a visionary and builder. Don't over-explain Resourceful. Ask what's alive for him right now.",
    thread: [
      { from: 'rizz', text: 'Nick has shared the platform with you as the first person to see it. Take your time exploring.' },
      { from: 'them', text: 'This feels genuinely different. The Sacred Valley energy is in the DNA here.' }
    ]
  },
  giles: {
    name: 'Giles Custerson',
    sub: 'FCA governance · Custerson Consulting',
    possibility: 'Deep FCA and governance expertise — 30h of prior context. Strong fit for advisory or founding investor role. Lead with ARIA regulatory strategy.',
    rizz_ctx: 'He responds well to governance framing. Avoid equity talk early. Patient, methodical thinker — give him space.',
    thread: [
      { from: 'rizz', text: 'Nick has shared context about ARIA and the governance angle.' },
      { from: 'them', text: 'The regulatory structuring piece is exactly where I\'ve been focused. What\'s the timeline?' },
      { from: 'rizz', text: 'Nick is working through the next stage of the ARIA proposal. Open to an advisory conversation next week?' }
    ]
  },
  sarah: {
    name: 'Sarah Jensen',
    sub: 'Frontend engineer · React / Next.js',
    possibility: 'Excellent frontend skills, already familiar with the stack. Strong builder contributor on dashboard and onboarding flow. Potential bounty lead or part-time contractor.',
    rizz_ctx: 'She likes clear specs and concrete tasks. Don\'t over-philosophise — lead with what needs building.',
    thread: [
      { from: 'rizz', text: 'Welcome Sarah! Nick has context about where your skills might fit.' },
      { from: 'them', text: 'Looks great — what\'s the most urgent thing to work on?' }
    ]
  },
  marcus: {
    name: 'Marcus Torres',
    sub: 'Product strategist · Web3 / tokenomics',
    possibility: 'Tokenomics and Web3 product experience directly relevant to the RSF token layer. Could shape the economic model and bounty mechanics.',
    rizz_ctx: 'Still early — hasn\'t engaged much. Keep first contact light and curious, not salesy.',
    thread: [
      { from: 'rizz', text: 'Marcus just joined. Nick wanted to send a brief hello and give you space to explore.' }
    ]
  }
};

const tabs = ['members', 'invite', 'calendar', 'content', 'async'];

export default function SuperuserPage() {
  const [currentTab, setCurrentTab] = useState('members');
  const [currentMember, setCurrentMember] = useState<string | null>(null);
  const [showInviteResult, setShowInviteResult] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');

  const updateRizzPanel = () => {
    if (currentMember && members[currentMember]) {
      return {
        title: members[currentMember].name,
        msg: 'Selected member context loaded.',
        showDetail: true,
        possibility: members[currentMember].possibility,
        rizzCtx: members[currentMember].rizz_ctx,
        thread: members[currentMember].thread
      };
    } else {
      const msgs: Record<string, string> = {
        members: 'You have 4 members at various stages. Joseph Brand just joined — first impression matters most right now.',
        invite: 'Fill in the possibility and Rizz context fields carefully — that\'s what makes each invite feel genuinely personal.',
        calendar: 'Thursday slot has 4 watchers but only 1 confirmed. Worth a nudge.',
        content: 'Platform overview video is your highest-converting piece.',
        async: 'Giles thread is waiting on your input.'
      };
      return {
        title: 'Rizz intelligence',
        msg: msgs[currentTab] || '',
        showDetail: false,
        possibility: '',
        rizzCtx: '',
        thread: []
      };
    }
  };

  const rizzPanel = updateRizzPanel();

  const handleSetTab = (tab: string) => {
    setCurrentTab(tab);
    if (tab !== 'members') {
      setCurrentMember(null);
    }
  };

  const handleSelectMember = (key: string) => {
    setCurrentMember(key);
  };

  const generateInvite = () => {
    const nameInput = (document.getElementById('inv-name') as HTMLInputElement)?.value || 'Guest';
    const first = nameInput.split(' ')[0].toLowerCase();
    const rand = Math.random().toString(36).substring(2, 6);
    const token = `${first}-${rand}`;
    setInviteUrl(`localhost:3000/v2/join/${token}`);
    setShowInviteResult(true);
  };

  return (
    <div className="min-h-screen bg-[#1a1a1f] p-8">
      <div className="max-w-[1100px] mx-auto">
        {/* Topbar */}
        <div className="topbar bg-white border-b border-[#e0dfd8] h-11 flex items-center px-4 gap-3 flex-shrink-0 rounded-t-2xl">
          <div className="topbar-logo flex items-center gap-1.5 text-sm font-medium text-[#534AB7]">
            <div className="topbar-logo-icon w-5 h-5 rounded-full bg-[#534AB7] flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="4" stroke="#eeedfe" strokeWidth="1.5" />
                <path d="M6 3v3l2 1" stroke="#eeedfe" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
            Resourceful
          </div>
          <div className="topbar-title text-sm font-medium text-[#1a1a1f] flex-1 ml-1">Superuser · Nick Hadfield</div>
          <div className="topbar-right flex items-center gap-2.5">
            <div className="topbar-icon w-7 h-7 rounded-full bg-[#f1efe8] flex items-center justify-center cursor-pointer">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="6" cy="6" r="4" stroke="#888780" strokeWidth="1.2" />
                <path d="M9.5 9.5l2.5 2.5" stroke="#888780" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="topbar-icon w-7 h-7 rounded-full bg-[#f1efe8] flex items-center justify-center cursor-pointer">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2a2 2 0 0 1 2 2v3l1 1v1H4v-1l1-1V4a2 2 0 0 1 2-2zm-1 8h2" stroke="#888780" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="avatar-n w-7 h-7 rounded-full bg-[#534AB7] text-[#eeedfe] text-xs font-medium flex items-center justify-center">N</div>
          </div>
        </div>

        <div className="main flex flex-1 overflow-hidden bg-[#f5f4f0] rounded-b-2xl border border-t-0 border-[#e0dfd8]">
        {/* Left Nav */}
        <div className="left-nav w-[210px] bg-white border-r border-[#e0dfd8] flex-shrink-0 p-3 flex flex-col gap-0.5">
          <div className="nav-label text-[10px] text-[#888780] font-medium uppercase tracking-[0.06em] px-2.5 py-1">Manage</div>
          <div className={`nav-item flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-sm text-[#444441] ${currentTab === 'members' ? 'active bg-[#eeedfe] text-[#534AB7] font-medium' : 'hover:bg-[#f1efe8]'}`} onClick={() => handleSetTab('members')}>
            <svg className="nav-icon w-[15px] h-[15px]" viewBox="0 0 15 15" fill="none"><circle cx="5.5" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1 12c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M11 7c1.5 0 3 1 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><circle cx="11" cy="4" r="2" stroke="currentColor" strokeWidth="1.2"/></svg>
            Members <span className="nav-badge ml-auto bg-[#eeedfe] text-[#534AB7] text-[10px] font-medium rounded-[10px] px-1.5">4</span>
          </div>
          <div className={`nav-item flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-sm text-[#444441] ${currentTab === 'invite' ? 'active bg-[#eeedfe] text-[#534AB7] font-medium' : 'hover:bg-[#f1efe8]'}`} onClick={() => handleSetTab('invite')}>
            <svg className="nav-icon w-[15px] h-[15px]" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M7.5 5v5M5 7.5h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            Invite
          </div>
          <div className={`nav-item flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-sm text-[#444441] ${currentTab === 'calendar' ? 'active bg-[#eeedfe] text-[#534AB7] font-medium' : 'hover:bg-[#f1efe8]'}`} onClick={() => handleSetTab('calendar')}>
            <svg className="nav-icon w-[15px] h-[15px]" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/><path d="M5 1.5v3M10 1.5v3M1.5 7h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            Calendar
          </div>
          <div className={`nav-item flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-sm text-[#444441] ${currentTab === 'content' ? 'active bg-[#eeedfe] text-[#534AB7] font-medium' : 'hover:bg-[#f1efe8]'}`} onClick={() => handleSetTab('content')}>
            <svg className="nav-icon w-[15px] h-[15px]" viewBox="0 0 15 15" fill="none"><rect x="2" y="1.5" width="11" height="12" rx="2" stroke="currentColor" strokeWidth="1.2"/><path d="M5 5h5M5 8h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            Content
          </div>
          <div className={`nav-item flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-sm text-[#444441] ${currentTab === 'async' ? 'active bg-[#eeedfe] text-[#534AB7] font-medium' : 'hover:bg-[#f1efe8]'}`} onClick={() => handleSetTab('async')}>
            <svg className="nav-icon w-[15px] h-[15px]" viewBox="0 0 15 15" fill="none"><path d="M2 3h11v7H8.5L6 12.5V10H2V3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
            Async threads <span className="nav-badge ml-auto bg-[#e0dfd8] text-[#5f5e5a] text-[10px] font-medium rounded-[10px] px-1.5">1</span>
          </div>
        </div>

            {/* Center Content (dark inner screen) */}
            <div className="center flex-1 overflow-y-auto bg-[#0d1322] p-3.5 text-white">
          <div className="center-inner flex flex-col gap-2.5">
            {currentTab === 'members' && (
              <>
                {/* Stats Row */}
                <div className="stats-row grid grid-cols-4 gap-2">
                  <div className="stat-card bg-white border border-[#e0dfd8] rounded-[10px] p-2.5">
                    <div className="stat-num text-[20px] font-medium text-[#1a1a1f]">9</div>
                    <div className="stat-lbl text-xs text-[#888780] mt-0.5">Invited</div>
                  </div>
                  <div className="stat-card bg-white border border-[#e0dfd8] rounded-[10px] p-2.5">
                    <div className="stat-num text-[20px] font-medium text-[#1a1a1f]">4</div>
                    <div className="stat-lbl text-xs text-[#888780] mt-0.5">Onboarding</div>
                  </div>
                  <div className="stat-card bg-white border border-[#e0dfd8] rounded-[10px] p-2.5">
                    <div className="stat-num text-[20px] font-medium text-[#1a1a1f]">2</div>
                    <div className="stat-lbl text-xs text-[#888780] mt-0.5">Active</div>
                  </div>
                  <div className="stat-card bg-white border border-[#e0dfd8] rounded-[10px] p-2.5">
                    <div className="stat-num text-[20px] font-medium text-[#1a1a1f]">3</div>
                    <div className="stat-lbl text-xs text-[#888780] mt-0.5">Calls this week</div>
                  </div>
                </div>

                {/* Builders List */}
                <div className="card bg-white border border-[#e0dfd8] rounded-xl p-3">
                  <div className="section-label text-[10px] text-[#888780] font-medium uppercase tracking-[0.06em] mb-2">Builders & collaborators</div>
                  {Object.keys(members).map((key) => {
                    const m = members[key];
                    return (
                      <div key={key} className={`member-row flex items-center gap-2.5 px-2.5 py-2 border border-[#e0dfd8] rounded-lg cursor-pointer mb-1.5 hover:border-[#afa9ec] ${currentMember === key ? 'selected border-[#534AB7]' : ''}`} onClick={() => handleSelectMember(key)}>
                        <div className="av w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0" style={{ background: key === 'joe' || key === 'giles' ? '#eeedfe' : key === 'sarah' ? '#EAF3DE' : '#FAEEDA', color: key === 'joe' || key === 'giles' ? '#534AB7' : key === 'sarah' ? '#3B6D11' : '#854F0B' }}>
                          {m.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="member-info flex-1 min-w-0">
                          <div className="member-name text-sm font-medium text-[#1a1a1f]">{m.name}</div>
                          <div className="member-sub text-xs text-[#888780] mt-px truncate">{m.sub}</div>
                          <div className="progress-bar h-0.5 bg-[#e0dfd8] rounded mt-1"><div className="progress-fill h-full rounded bg-[#534AB7]" style={{ width: key === 'joe' ? '15%' : key === 'giles' ? '65%' : key === 'sarah' ? '40%' : '20%' }} /></div>
                        </div>
                        <span className="status-chip text-xs px-1.5 py-0.5 rounded-[10px] whitespace-nowrap" style={{ background: key === 'joe' ? '#eeedfe' : key === 'giles' ? '#EAF3DE' : key === 'sarah' ? '#FAEEDA' : '#f1efe8', color: key === 'joe' ? '#534AB7' : key === 'giles' ? '#3B6D11' : key === 'sarah' ? '#854F0B' : '#5f5e5a' }}>
                          {key === 'joe' ? 'Invited' : key === 'giles' ? 'Active' : key === 'sarah' ? 'Onboarding' : 'Invited'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Other tabs */}
            {currentTab === 'invite' && <div className="card bg-white border border-[#e0dfd8] rounded-xl p-3 text-sm text-[#888780]">Invite form coming soon</div>}
            {currentTab === 'calendar' && <div className="card bg-white border border-[#e0dfd8] rounded-xl p-3 text-sm text-[#888780]">Calendar view coming soon</div>}
            {currentTab === 'content' && <div className="card bg-white border border-[#e0dfd8] rounded-xl p-3 text-sm text-[#888780]">Content view coming soon</div>}
            {currentTab === 'async' && <div className="card bg-white border border-[#e0dfd8] rounded-xl p-3 text-sm text-[#888780]">Async threads coming soon</div>}
          </div>
        </div>

        {/* Right Panel (white) */}
        <div className="right-panel w-[230px] bg-white border-l border-[#e0dfd8] flex-shrink-0 flex flex-col">
          <div className="rp-header px-3 py-2.5 border-b border-[#e0dfd8] text-xs font-medium text-[#1a1a1f] flex items-center gap-1.5">
            <div className="rp-dot w-1.5 h-1.5 rounded-full bg-[#1D9E75] flex-shrink-0"></div>
            <span>{rizzPanel.title}</span>
          </div>
          <div className="rp-body flex-1 overflow-y-auto p-3 text-sm">
            <div className="rizz-msg bg-[#f5f4f0] rounded-lg p-2 text-xs leading-[1.55]">{rizzPanel.msg}</div>
            {rizzPanel.showDetail && (
              <div className="mt-3">
                <div className="rp-section-lbl text-[10px] text-[#888780] font-medium uppercase tracking-[0.06em] mb-1">Possibility</div>
                <div className="rp-text text-xs text-[#444441] leading-[1.5]">{rizzPanel.possibility}</div>

                <div className="rp-section-lbl text-[10px] text-[#888780] font-medium uppercase tracking-[0.06em] mt-3 mb-1">Rizz context (private)</div>
                <div className="rp-text italic text-xs text-[#888780] leading-[1.5]">{rizzPanel.rizzCtx}</div>

                <div className="rp-section-lbl text-[10px] text-[#888780] font-medium uppercase tracking-[0.06em] mt-3 mb-1">Async thread</div>
                {rizzPanel.thread.map((msg, i) => (
                  <div key={i} className={`thread-msg text-xs text-[#444441] leading-[1.45] p-1.5 px-2 rounded-md border-l-2 mb-1 ${msg.from === 'them' ? 'border-l-[#1D9E75] bg-[#f5f4f0]' : 'border-l-[#534AB7] bg-[#f5f4f0]'}`}>{msg.text}</div>
                ))}
              </div>
            )}
          </div>
          <div className="rp-footer px-2.5 py-2 border-t border-[#e0dfd8] flex gap-1.5">
            <input className="rp-input flex-1 text-xs px-2 py-1 border border-[#e0dfd8] rounded-md bg-[#f5f4f0]" placeholder="Add context for Rizz..." />
            <button className="send-btn w-6 h-6 rounded-md bg-[#534AB7] border-none cursor-pointer flex items-center justify-center flex-shrink-0">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 5.5h9M6.5 2l3.5 3.5L6.5 9" stroke="#eeedfe" strokeWidth="1.3" strokeLinecap="round" /></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 text-center text-xs text-[#888780]">
        Quick links: <a href="/onboardingv4.html" className="text-[#534AB7] hover:underline">Onboarding Flow</a> · <a href="/v2/room/meeting-temp-1-fixed" className="text-[#534AB7] hover:underline">Call Room</a>
      </div>
    </div>
  );
}
