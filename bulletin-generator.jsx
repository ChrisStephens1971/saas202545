import React, { useState } from 'react';
import { Printer, Eye, Edit3, Save, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';

const defaultBulletin = {
  churchName: "Grace Community Church",
  tagline: "Growing Together in Faith",
  date: "Sunday, December 8, 2024",
  serviceTime: "10:30 AM",
  sermonTitle: "Walking in the Light",
  sermonSeries: "Journey of Faith",
  scripture: "John 8:12",
  scriptureText: '"I am the light of the world. Whoever follows me will never walk in darkness, but will have the light of life."',
  pastor: "Rev. Michael Thompson",
  orderOfService: [
    { item: "Prelude", details: "" },
    { item: "Welcome & Announcements", details: "" },
    { item: "Call to Worship", details: "" },
    { item: "Opening Hymn", details: "Amazing Grace #378" },
    { item: "Prayer of Confession", details: "" },
    { item: "Assurance of Pardon", details: "" },
    { item: "Scripture Reading", details: "John 8:12-20" },
    { item: "Hymn of Preparation", details: "Open My Eyes #324" },
    { item: "Sermon", details: "Walking in the Light" },
    { item: "Hymn of Response", details: "I Have Decided #456" },
    { item: "Offering", details: "" },
    { item: "Doxology", details: "" },
    { item: "Benediction", details: "" },
  ],
  announcements: [
    { title: "Men's Breakfast", text: "Join us Saturday at 8am in Fellowship Hall." },
    { title: "Choir Practice", text: "Wednesday evenings at 7pm. New members welcome!" },
    { title: "Youth Group", text: "Sunday evenings 5-7pm. This week: Game Night!" },
  ],
  prayerRequests: [
    "The Johnson family as they welcome their new baby",
    "Those affected by the recent storms",
    "Our missionaries serving overseas",
  ],
  upcomingEvents: [
    { date: "Dec 15", event: "Christmas Cantata", time: "6:00 PM" },
    { date: "Dec 24", event: "Christmas Eve Service", time: "7:00 PM" },
    { date: "Dec 31", event: "New Year's Eve Prayer Vigil", time: "10:00 PM" },
  ],
  contactInfo: {
    address: "123 Faith Street, Springfield, IL 62701",
    phone: "(555) 123-4567",
    email: "info@gracecommunity.org",
    website: "www.gracecommunity.org",
  },
  givingText: "Give online at our website or text GIVE to 55555",
  welcomeMessage: "We're so glad you're here! If you're visiting, please fill out a connection card.",
};

const CollapsibleSection = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-stone-200 rounded-lg mb-3 overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-stone-50 flex items-center justify-between text-left hover:bg-stone-100"
      >
        <span className="font-semibold text-stone-700 text-sm">{title}</span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {isOpen && <div className="p-3 bg-white">{children}</div>}
    </div>
  );
};

const Field = ({ label, value, onChange, multiline = false }) => (
  <div className="mb-2">
    <label className="block text-xs font-medium text-stone-500 mb-1">{label}</label>
    {multiline ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm resize-none"
        rows={2}
      />
    ) : (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm"
      />
    )}
  </div>
);

const BulletinPreview = ({ data }) => {
  const pageBase = "bg-white shadow-md overflow-hidden flex-shrink-0 w-40 h-60";
  
  return (
    <div className="flex flex-wrap gap-3 justify-center p-2">
      {/* Page 1 - Front Cover */}
      <div className={pageBase} style={{ background: 'linear-gradient(180deg, #faf7f2 0%, #f5f0e8 100%)' }}>
        <div className="h-full flex flex-col items-center justify-between p-3 text-center">
          <div className="w-6 h-px bg-amber-700 mt-1" />
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-6 h-6 border border-amber-700 rounded flex items-center justify-center mb-1">
              <span className="text-amber-700 text-xs">✝</span>
            </div>
            <h1 className="text-xs font-bold text-stone-800 mb-0.5 leading-tight">{data.churchName}</h1>
            <p className="text-[8px] text-stone-500 tracking-wider uppercase mb-2">{data.tagline}</p>
            <div className="w-8 h-px bg-amber-700/30 mb-2" />
            <p className="text-stone-600 text-[8px] mb-0.5">{data.date}</p>
            <p className="text-stone-500 text-[7px]">{data.serviceTime}</p>
          </div>
          <div className="mb-2">
            {data.sermonSeries && <p className="text-[7px] text-amber-700 tracking-wider uppercase mb-0.5">{data.sermonSeries}</p>}
            <h2 className="text-[10px] font-semibold text-stone-800 mb-0.5">{data.sermonTitle}</h2>
            <p className="text-stone-600 text-[8px] italic">{data.scripture}</p>
          </div>
          <div className="px-2 py-1 bg-white/50 rounded">
            <p className="text-[7px] text-stone-600 italic leading-tight line-clamp-2">{data.scriptureText}</p>
          </div>
          <div className="w-6 h-px bg-amber-700 mb-1" />
        </div>
      </div>
      
      {/* Page 2 - Order of Service */}
      <div className={pageBase}>
        <div className="h-full flex flex-col p-2">
          <div className="text-center mb-2">
            <h2 className="text-[10px] font-semibold text-stone-800">Order of Worship</h2>
            <div className="w-6 h-px bg-amber-700 mx-auto mt-0.5" />
          </div>
          <div className="flex-1 space-y-0.5 overflow-hidden">
            {data.orderOfService.slice(0, 10).map((item, i) => (
              <div key={i} className="flex items-baseline gap-1 py-0.5 border-b border-stone-100 last:border-0">
                <span className="text-stone-800 font-medium text-[7px]">{item.item}</span>
                {item.details && <span className="text-stone-400 text-[6px] italic truncate">{item.details}</span>}
              </div>
            ))}
            {data.orderOfService.length > 10 && (
              <p className="text-[6px] text-stone-400 italic">+{data.orderOfService.length - 10} more...</p>
            )}
          </div>
          <div className="mt-1 pt-1 border-t border-stone-200 text-center">
            <p className="text-[7px] text-stone-600">{data.pastor}</p>
          </div>
        </div>
      </div>
      
      {/* Page 3 - Announcements */}
      <div className={pageBase}>
        <div className="h-full flex flex-col p-2">
          <h2 className="text-[9px] font-semibold text-stone-800 mb-1">Announcements</h2>
          <div className="space-y-1 mb-2">
            {data.announcements.slice(0, 3).map((ann, i) => (
              <div key={i} className="pb-1 border-b border-stone-100 last:border-0">
                <h3 className="font-semibold text-amber-800 text-[7px]">{ann.title}</h3>
                <p className="text-stone-600 text-[6px] line-clamp-2">{ann.text}</p>
              </div>
            ))}
          </div>
          <h2 className="text-[9px] font-semibold text-stone-800 mb-1">Prayer Requests</h2>
          <ul className="space-y-0.5 flex-1 overflow-hidden">
            {data.prayerRequests.slice(0, 4).map((prayer, i) => (
              <li key={i} className="flex items-start gap-0.5 text-[6px] text-stone-600">
                <span className="text-amber-700">•</span>
                <span className="line-clamp-1">{prayer}</span>
              </li>
            ))}
          </ul>
          <div className="mt-1 p-1.5 bg-amber-50 rounded">
            <p className="text-[6px] text-stone-700 text-center italic line-clamp-2">{data.welcomeMessage}</p>
          </div>
        </div>
      </div>
      
      {/* Page 4 - Back */}
      <div className={pageBase} style={{ background: 'linear-gradient(180deg, #faf7f2 0%, #f5f0e8 100%)' }}>
        <div className="h-full flex flex-col p-2">
          <h2 className="text-[9px] font-semibold text-stone-800 mb-2 text-center">Upcoming Events</h2>
          <div className="space-y-1.5 mb-2">
            {data.upcomingEvents.slice(0, 3).map((event, i) => (
              <div key={i} className="flex items-center gap-1.5 p-1.5 bg-white rounded shadow-sm">
                <div className="w-7 h-7 bg-amber-100 rounded flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-[6px] text-amber-700 font-semibold leading-tight">{event.date}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-800 text-[7px] truncate">{event.event}</p>
                  <p className="text-[6px] text-stone-500">{event.time}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-1.5 bg-white rounded text-center mb-2">
            <h3 className="font-semibold text-stone-700 text-[7px] mb-0.5">Online Giving</h3>
            <p className="text-[6px] text-stone-500 line-clamp-1">{data.givingText}</p>
          </div>
          <div className="mt-auto text-center">
            <div className="w-6 h-px bg-amber-700 mx-auto mb-1" />
            <p className="font-semibold text-stone-800 text-[8px] mb-0.5">{data.churchName}</p>
            <div className="text-[6px] text-stone-500 space-y-0">
              <p className="truncate">{data.contactInfo.address}</p>
              <p>{data.contactInfo.phone}</p>
              <p className="text-amber-700">{data.contactInfo.website}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ChurchBulletinGenerator() {
  const [bulletin, setBulletin] = useState(defaultBulletin);
  const [view, setView] = useState('edit');
  
  const updateField = (field, value) => setBulletin(prev => ({ ...prev, [field]: value }));
  const updateNested = (parent, field, value) => setBulletin(prev => ({
    ...prev, [parent]: { ...prev[parent], [field]: value }
  }));
  const updateArrayItem = (field, index, key, value) => setBulletin(prev => ({
    ...prev,
    [field]: prev[field].map((item, i) => i === index ? (typeof item === 'object' ? { ...item, [key]: value } : value) : item)
  }));
  const addArrayItem = (field, template) => setBulletin(prev => ({ ...prev, [field]: [...prev[field], template] }));
  const removeArrayItem = (field, index) => setBulletin(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  
  const handleExport = () => {
    const dataStr = JSON.stringify(bulletin, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulletin-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-stone-100">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <span className="text-amber-700 font-bold">✝</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-stone-800">Bulletin Generator</h1>
              <p className="text-xs text-stone-500">8.5×11 Half-Fold</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView(view === 'edit' ? 'preview' : 'edit')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${
                view === 'preview' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {view === 'edit' ? <Eye size={16} /> : <Edit3 size={16} />}
              {view === 'edit' ? 'Preview' : 'Edit'}
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
            >
              <Save size={16} /> Save JSON
            </button>
          </div>
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto p-4">
        {view === 'edit' ? (
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="space-y-2 max-h-[80vh] overflow-auto pr-2">
              <CollapsibleSection title="Church Info">
                <Field label="Church Name" value={bulletin.churchName} onChange={(v) => updateField('churchName', v)} />
                <Field label="Tagline" value={bulletin.tagline} onChange={(v) => updateField('tagline', v)} />
                <Field label="Pastor" value={bulletin.pastor} onChange={(v) => updateField('pastor', v)} />
              </CollapsibleSection>
              
              <CollapsibleSection title="Service Details">
                <Field label="Date" value={bulletin.date} onChange={(v) => updateField('date', v)} />
                <Field label="Service Time" value={bulletin.serviceTime} onChange={(v) => updateField('serviceTime', v)} />
                <Field label="Sermon Series" value={bulletin.sermonSeries} onChange={(v) => updateField('sermonSeries', v)} />
                <Field label="Sermon Title" value={bulletin.sermonTitle} onChange={(v) => updateField('sermonTitle', v)} />
                <Field label="Scripture" value={bulletin.scripture} onChange={(v) => updateField('scripture', v)} />
                <Field label="Scripture Text" value={bulletin.scriptureText} onChange={(v) => updateField('scriptureText', v)} multiline />
              </CollapsibleSection>
              
              <CollapsibleSection title="Order of Service" defaultOpen={false}>
                {bulletin.orderOfService.map((item, i) => (
                  <div key={i} className="flex gap-1 mb-2 items-center">
                    <div className="flex-1 flex gap-1">
                      <input
                        type="text"
                        value={item.item}
                        onChange={(e) => updateArrayItem('orderOfService', i, 'item', e.target.value)}
                        placeholder="Item"
                        className="flex-1 px-2 py-1 border border-stone-300 rounded text-xs"
                      />
                      <input
                        type="text"
                        value={item.details}
                        onChange={(e) => updateArrayItem('orderOfService', i, 'details', e.target.value)}
                        placeholder="Details"
                        className="flex-1 px-2 py-1 border border-stone-200 rounded text-xs"
                      />
                    </div>
                    <button onClick={() => removeArrayItem('orderOfService', i)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button onClick={() => addArrayItem('orderOfService', { item: '', details: '' })} className="flex items-center gap-1 text-xs text-amber-700">
                  <Plus size={14} /> Add Item
                </button>
              </CollapsibleSection>
              
              <CollapsibleSection title="Announcements" defaultOpen={false}>
                {bulletin.announcements.map((ann, i) => (
                  <div key={i} className="flex gap-1 mb-2 items-start">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={ann.title}
                        onChange={(e) => updateArrayItem('announcements', i, 'title', e.target.value)}
                        placeholder="Title"
                        className="w-full px-2 py-1 border border-stone-300 rounded text-xs mb-1"
                      />
                      <textarea
                        value={ann.text}
                        onChange={(e) => updateArrayItem('announcements', i, 'text', e.target.value)}
                        placeholder="Details"
                        className="w-full px-2 py-1 border border-stone-200 rounded text-xs resize-none"
                        rows={2}
                      />
                    </div>
                    <button onClick={() => removeArrayItem('announcements', i)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button onClick={() => addArrayItem('announcements', { title: '', text: '' })} className="flex items-center gap-1 text-xs text-amber-700">
                  <Plus size={14} /> Add
                </button>
              </CollapsibleSection>
              
              <CollapsibleSection title="Prayer Requests" defaultOpen={false}>
                {bulletin.prayerRequests.map((prayer, i) => (
                  <div key={i} className="flex gap-1 mb-1">
                    <input
                      type="text"
                      value={prayer}
                      onChange={(e) => {
                        const newPrayers = [...bulletin.prayerRequests];
                        newPrayers[i] = e.target.value;
                        updateField('prayerRequests', newPrayers);
                      }}
                      className="flex-1 px-2 py-1 border border-stone-300 rounded text-xs"
                    />
                    <button onClick={() => removeArrayItem('prayerRequests', i)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button onClick={() => addArrayItem('prayerRequests', '')} className="flex items-center gap-1 text-xs text-amber-700 mt-1">
                  <Plus size={14} /> Add
                </button>
              </CollapsibleSection>
              
              <CollapsibleSection title="Upcoming Events" defaultOpen={false}>
                {bulletin.upcomingEvents.map((event, i) => (
                  <div key={i} className="flex gap-1 mb-2 items-center">
                    <input type="text" value={event.date} onChange={(e) => updateArrayItem('upcomingEvents', i, 'date', e.target.value)} placeholder="Date" className="w-16 px-1 py-1 border border-stone-300 rounded text-xs" />
                    <input type="text" value={event.event} onChange={(e) => updateArrayItem('upcomingEvents', i, 'event', e.target.value)} placeholder="Event" className="flex-1 px-2 py-1 border border-stone-300 rounded text-xs" />
                    <input type="text" value={event.time} onChange={(e) => updateArrayItem('upcomingEvents', i, 'time', e.target.value)} placeholder="Time" className="w-20 px-1 py-1 border border-stone-300 rounded text-xs" />
                    <button onClick={() => removeArrayItem('upcomingEvents', i)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button onClick={() => addArrayItem('upcomingEvents', { date: '', event: '', time: '' })} className="flex items-center gap-1 text-xs text-amber-700">
                  <Plus size={14} /> Add
                </button>
              </CollapsibleSection>
              
              <CollapsibleSection title="Contact Info" defaultOpen={false}>
                <Field label="Address" value={bulletin.contactInfo.address} onChange={(v) => updateNested('contactInfo', 'address', v)} />
                <Field label="Phone" value={bulletin.contactInfo.phone} onChange={(v) => updateNested('contactInfo', 'phone', v)} />
                <Field label="Email" value={bulletin.contactInfo.email} onChange={(v) => updateNested('contactInfo', 'email', v)} />
                <Field label="Website" value={bulletin.contactInfo.website} onChange={(v) => updateNested('contactInfo', 'website', v)} />
                <Field label="Giving Info" value={bulletin.givingText} onChange={(v) => updateField('givingText', v)} />
                <Field label="Welcome Message" value={bulletin.welcomeMessage} onChange={(v) => updateField('welcomeMessage', v)} multiline />
              </CollapsibleSection>
            </div>
            
            <div className="lg:sticky lg:top-16 lg:self-start">
              <div className="bg-white rounded-xl shadow-lg p-4">
                <h3 className="text-xs font-semibold text-stone-500 mb-3 uppercase tracking-wide text-center">Live Preview — 4 Pages</h3>
                <BulletinPreview data={bulletin} />
                <p className="text-[10px] text-stone-400 text-center mt-3">Page 1 (Front) → Page 2 (Inside L) → Page 3 (Inside R) → Page 4 (Back)</p>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-center">
              <p className="text-stone-700 text-sm mb-1">
                <strong>Print Instructions:</strong> Print double-sided, flip on short edge, fold in half.
              </p>
              <p className="text-stone-500 text-xs">
                Pages shown in reading order. Use the Save JSON button to export your bulletin data.
              </p>
            </div>
            <BulletinPreview data={bulletin} />
          </div>
        )}
      </main>
    </div>
  );
}
