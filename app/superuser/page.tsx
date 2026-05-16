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
    possibility: 'Met in Sacred Valley Dec 2024. Both running projects deeply aligned with Resourceful.',
    rizz_ctx: "This is not an orientation — it's a continuation.",
    thread: []
  },
  giles: {
    name: 'Giles Custerson',
    sub: 'FCA governance · Custerson Consulting',
    possibility: 'Deep FCA and governance expertise.',
    rizz_ctx: 'He responds well to governance framing.',
    thread: []
  },
  sarah: {
    name: 'Sarah Jensen',
    sub: 'Frontend engineer · React / Next.js',
    possibility: 'Excellent frontend skills.',
    rizz_ctx: 'She likes clear specs and concrete tasks.',
    thread: []
  },
  marcus: {
    name: 'Marcus Torres',
    sub: 'Product strategist · Web3 / tokenomics',
    possibility: 'Tokenomics and Web3 product experience.',
    rizz_ctx: 'Still early — hasn\'t engaged much.',
    thread: []
  }
};

const tabs = ['members', 'invite', 'calendar', 'content', 'async', 'rizz-intelligence'];

export default function SuperuserPage() {
  const [currentTab, setCurrentTab] = useState('members');
  const [currentMember, setCurrentMember] = useState<string | null>(null);
  const [showInviteResult, setShowInviteResult] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [rizzSubTab, setRizzSubTab] = useState<'core' | 'knowledge' | 'git' | 'status'>('core');

  const handleSetTab = (tab: string) => {
    setCurrentTab(tab);
    if (tab !== 'members') setCurrentMember(null);
    if (tab !== 'rizz-intelligence') setRizzSubTab('core');
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
    <div className="min-h-screen bg-[#f5f4f0]">
      <div className="topbar bg-white border-b border-[#e0dfd8] h-11 flex items-center px-4 gap-3 flex-shrink-0">
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
          <div className="topbar-icon w-7 h-7 rounded-full bg-[#f1efe8] flex items-center justify-center cursor-pointer">🔍</div>
          <div className="topbar-icon w-7 h-7 rounded-full bg-[#f1efe8] flex items-center justify-center cursor-pointer">🔔</div>
          <div className="avatar-n w-7 h-7 rounded-full bg-[#534AB7] text-[#eeedfe] text-xs font-medium flex items-center justify-center">N</div>
        </div>
      </div>

      <div className="main flex flex-1 overflow-hidden">
        <div className="left-nav w-[210px] bg-white border-r border-[#e0dfd8] flex-shrink-0 p-3 flex flex-col gap-0.5">
          <div className="nav-label text-[10px] text-[#888780] font-medium uppercase tracking-[0.06em] px-2.5 py-1">Manage</div>
          <div className={`nav-item flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-sm text-[#444441] ${currentTab === 'members' ? 'active bg-[#eeedfe] text-[#534AB7] font-medium' : 'hover:bg-[#f1efe8]'}`} onClick={() => handleSetTab('members')}>
            Members <span className="nav-badge ml-auto bg-[#eeedfe] text-[#534AB7] text-[10px] font-medium rounded-[10px] px-1.5">4</span>
          </div>
          <div className={`nav-item flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-sm text-[#444441] ${currentTab === 'invite' ? 'active bg-[#eeedfe] text-[#534AB7] font-medium' : 'hover:bg-[#f1efe8]'}`} onClick={() => handleSetTab('invite')}>
            Invite
          </div>
          <div className={`nav-item flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-sm text-[#444441] ${currentTab === 'calendar' ? 'active bg-[#eeedfe] text-[#534AB7] font-medium' : 'hover:bg-[#f1efe8]'}`} onClick={() => handleSetTab('calendar')}>
            Calendar
          </div>
          <div className={`nav-item flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-sm text-[#444441] ${currentTab === 'content' ? 'active bg-[#eeedfe] text-[#534AB7] font-medium' : 'hover:bg-[#f1efe8]'}`} onClick={() => handleSetTab('content')}>
            Content
          </div>
          <div className={`nav-item flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-sm text-[#444441] ${currentTab === 'async' ? 'active bg-[#eeedfe] text-[#534AB7] font-medium' : 'hover:bg-[#f1efe8]'}`} onClick={() => handleSetTab('async')}>
            Async threads <span className="nav-badge ml-auto bg-[#e0dfd8] text-[#5f5e5a] text-[10px] font-medium rounded-[10px] px-1.5">1</span>
          </div>

          <div className="nav-label mt-3">Intelligence</div>
          <div className={`nav-item flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-sm text-[#444441] ${currentTab === 'rizz-intelligence' ? 'active bg-[#eeedfe] text-[#534AB7] font-medium' : 'hover:bg-[#f1efe8]'}`} onClick={() => handleSetTab('rizz-intelligence')}>
            Rizz Intelligence
          </div>
        </div>

        <div className="center flex-1 overflow-y-auto bg-[#0d1322] p-3.5 text-white">
          <div className="center-inner flex flex-col gap-2.5">
            {currentTab === 'members' && (
              <>
                <div className="stats-row grid grid-cols-4 gap-2">
                  <div className="stat-card bg-white border border-[#e0dfd8] rounded-[10px] p-2.5"><div className="stat-num text-[20px] font-medium text-[#1a1a1f]">9</div><div className="stat-lbl text-xs text-[#888780] mt-0.5">Invited</div></div>
                  <div className="stat-card bg-white border border-[#e0dfd8] rounded-[10px] p-2.5"><div className="stat-num text-[20px] font-medium text-[#1a1a1f]">4</div><div className="stat-lbl text-xs text-[#888780] mt-0.5">Onboarding</div></div>
                  <div className="stat-card bg-white border border-[#e0dfd8] rounded-[10px] p-2.5"><div className="stat-num text-[20px] font-medium text-[#1a1a1f]">2</div><div className="stat-lbl text-xs text-[#888780] mt-0.5">Active</div></div>
                  <div className="stat-card bg-white border border-[#e0dfd8] rounded-[10px] p-2.5"><div className="stat-num text-[20px] font-medium text-[#1a1a1f]">3</div><div className="stat-lbl text-xs text-[#888780] mt-0.5">Calls this week</div></div>
                </div>

                <div className="card bg-white border border-[#e0dfd8] rounded-xl p-3">
                  <div className="section-label text-[10px] text-[#888780] font-medium uppercase tracking-[0.06em] mb-2">Builders & collaborators</div>
                  {Object.keys(members).map((key) => {
                    const m = members[key];
                    return (
                      <div key={key} className={`member-row flex items-center gap-2.5 px-2.5 py-2 border border-[#e0dfd8] rounded-lg cursor-pointer mb-1.5 hover:border-[#afa9ec] ${currentMember === key ? 'selected border-[#534AB7]' : ''}`} onClick={() => handleSelectMember(key)}>
                        <div className="av w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0" style={{ background: '#eeedfe', color: '#534AB7' }}>
                          {m.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="member-info flex-1 min-w-0">
                          <div className="member-name text-sm font-medium text-[#1a1a1f]">{m.name}</div>
                          <div className="member-sub text-xs text-[#888780] mt-px truncate">{m.sub}</div>
                        </div>
                        <span className="status-chip text-xs px-1.5 py-0.5 rounded-[10px] whitespace-nowrap" style={{ background: '#eeedfe', color: '#534AB7' }}>
                          {key === 'joe' ? 'Invited' : key === 'giles' ? 'Active' : key === 'sarah' ? 'Onboarding' : 'Invited'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {currentTab === 'rizz-intelligence' && (
              <div className="card bg-[#1a1a1f] border border-[#333] rounded-xl p-4">
                <div className="tab-pills flex gap-2 mb-4">
                  <div className="tab-pill active bg-[#534AB7] text-white px-3 py-1 rounded-full text-sm cursor-pointer">Core Prompts</div>
                  <div className="tab-pill border border-[#e0dfd8] text-[#888780] px-3 py-1 rounded-full text-sm cursor-pointer">Knowledge Base</div>
                  <div className="tab-pill border border-[#e0dfd8] text-[#888780] px-3 py-1 rounded-full text-sm cursor-pointer">Git Context</div>
                  <div className="tab-pill border border-[#e0dfd8] text-[#888780] px-3 py-1 rounded-full text-sm cursor-pointer">System Status</div>
                </div>
                <div className="text-sm text-white">Rizz Intelligence content (to be implemented)</div>
              </div>
            )}

            {currentTab === 'invite' && <div className="card bg-white border border-[#e0dfd8] rounded-xl p-3 text-sm text-[#888780]">Invite form coming soon</div>}
            {currentTab === 'calendar' && <div className="card bg-white border border-[#e0dfd8] rounded-xl p-3 text-sm text-[#888780]">Calendar view coming soon</div>}
            {currentTab === 'content' && <div className="card bg-white border border-[#e0dfd8] rounded-xl p-3 text-sm text-[#888780]">Content view coming soon</div>}
            {currentTab === 'async' && <div className="card bg-white border border-[#e0dfd8] rounded-xl p-3 text-sm text-[#888780]">Async threads coming soon</div>}
          </div>
        </div>

        <div className="right-panel w-[230px] bg-white border-l border-[#e0dfd8] flex-shrink-0 flex flex-col">
          <div className="rp-header px-3 py-2.5 border-b border-[#e0dfd8] text-xs font-medium text-[#1a1a1f] flex items-center gap-1.5">
            <div className="rp-dot w-1.5 h-1.5 rounded-full bg-[#1D9E75] flex-shrink-0"></div>
            <span>Rizz intelligence</span>
          </div>
          <div className="rp-body flex-1 overflow-y-auto p-3 text-sm">
            <div className="rizz-msg bg-[#f5f4f0] rounded-lg p-2 text-xs leading-[1.55]">You have 4 members at various stages. Joseph Brand just joined — first impression matters most right now.</div>
          </div>
          <div className="rp-footer px-2.5 py-2 border-t border-[#e0dfd8] flex gap-1.5">
            <input className="rp-input flex-1 text-xs px-2 py-1 border border-[#e0dfd8] rounded-md bg-[#f5f4f0]" placeholder="Add context for Rizz..." />
            <button className="send-btn w-6 h-6 rounded-md bg-[#534AB7] border-none cursor-pointer flex items-center justify-center flex-shrink-0">→</button>
          </div>
        </div>
      </div>

      <div className="mt-4 text-center text-xs text-[#888780]">
        Quick links: <a href="/onboardingv4.html" className="text-[#534AB7] hover:underline">Onboarding Flow</a> · <a href="/v2/room/meeting-temp-1-fixed" className="text-[#534AB7] hover:underline">Call Room</a>
      </div>
    </div>
  );
}
