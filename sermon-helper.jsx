import React, { useState } from 'react';
import { Search, Book, Music, FileText, Plus, X, GripVertical, ChevronDown, ChevronRight, Sparkles, Clock, Calendar, Loader2 } from 'lucide-react';

// Sample data for demonstrations
const SAMPLE_SCRIPTURES = [
  { reference: "John 3:16", text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.", theme: ["love", "salvation", "faith"] },
  { reference: "Romans 8:28", text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.", theme: ["hope", "purpose", "trust"] },
  { reference: "Psalm 23:1-4", text: "The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul.", theme: ["comfort", "guidance", "peace"] },
  { reference: "Philippians 4:13", text: "I can do all this through him who gives me strength.", theme: ["strength", "perseverance", "faith"] },
  { reference: "Isaiah 40:31", text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary.", theme: ["hope", "strength", "renewal"] },
];

const SAMPLE_HYMNS = [
  { title: "Amazing Grace", author: "John Newton", themes: ["grace", "salvation", "redemption"], denominations: ["Baptist", "Methodist", "Presbyterian", "Non-denominational"] },
  { title: "How Great Thou Art", author: "Carl Boberg", themes: ["praise", "creation", "majesty"], denominations: ["Baptist", "Lutheran", "Methodist", "Non-denominational"] },
  { title: "Be Thou My Vision", author: "Traditional Irish", themes: ["guidance", "devotion", "trust"], denominations: ["Catholic", "Episcopal", "Presbyterian", "Non-denominational"] },
  { title: "Great Is Thy Faithfulness", author: "Thomas Chisholm", themes: ["faithfulness", "hope", "trust"], denominations: ["Baptist", "Methodist", "Non-denominational"] },
  { title: "It Is Well With My Soul", author: "Horatio Spafford", themes: ["peace", "comfort", "faith"], denominations: ["Baptist", "Methodist", "Presbyterian", "Non-denominational"] },
];

const DENOMINATIONS = ["All", "Baptist", "Methodist", "Lutheran", "Presbyterian", "Catholic", "Episcopal", "Non-denominational"];

export default function SermonHelper() {
  const [activeTab, setActiveTab] = useState('builder');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDenomination, setSelectedDenomination] = useState('All');
  const [sermonTitle, setSermonTitle] = useState('');
  const [sermonDate, setSermonDate] = useState('');
  const [sermonTheme, setSermonTheme] = useState('');
  const [sermonElements, setSermonElements] = useState([]);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [expandedSections, setExpandedSections] = useState({ scriptures: true, hymns: true, notes: true });

  // AI-powered theme search
  const handleAISearch = async () => {
    if (!sermonTheme.trim()) return;
    
    setIsLoadingAI(true);
    
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          messages: [{
            role: "user",
            content: `You are a sermon preparation assistant. Given the theme "${sermonTheme}", provide suggestions in this exact JSON format only, no other text:
{
  "scriptures": [
    {"reference": "Book Chapter:Verse", "relevance": "Brief explanation of why this fits"},
    {"reference": "Book Chapter:Verse", "relevance": "Brief explanation"}
  ],
  "hymns": [
    {"title": "Hymn Name", "reason": "Why it fits the theme"}
  ],
  "outlineIdeas": [
    "Main point 1",
    "Main point 2", 
    "Main point 3"
  ],
  "illustrations": [
    "Brief illustration idea that connects to the theme"
  ]
}
Provide 3-4 scriptures, 3 hymns, 3 outline points, and 1-2 illustration ideas. Return ONLY valid JSON.`
          }]
        })
      });
      
      const data = await response.json();
      const content = data.content[0].text;
      
      // Parse the JSON response
      const suggestions = JSON.parse(content);
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error('AI search error:', error);
      // Fallback to sample suggestions
      setAiSuggestions({
        scriptures: [
          { reference: "Romans 8:28", relevance: "God works all things for good" },
          { reference: "Jeremiah 29:11", relevance: "God's plans for hope and future" }
        ],
        hymns: [
          { title: "Great Is Thy Faithfulness", reason: "Emphasizes God's constant care" }
        ],
        outlineIdeas: [
          "Introduction: Define the theme in everyday terms",
          "Scripture exploration: What the Bible teaches",
          "Application: How this changes our daily lives"
        ],
        illustrations: [
          "Personal story or historical example relating to the theme"
        ]
      });
    }
    
    setIsLoadingAI(false);
  };

  // Add element to sermon
  const addToSermon = (type, content) => {
    const newElement = {
      id: Date.now(),
      type,
      content,
      notes: ''
    };
    setSermonElements([...sermonElements, newElement]);
  };

  // Remove element from sermon
  const removeFromSermon = (id) => {
    setSermonElements(sermonElements.filter(el => el.id !== id));
  };

  // Move element in sermon order
  const moveElement = (index, direction) => {
    const newElements = [...sermonElements];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newElements.length) return;
    [newElements[index], newElements[newIndex]] = [newElements[newIndex], newElements[index]];
    setSermonElements(newElements);
  };

  // Update element notes
  const updateElementNotes = (id, notes) => {
    setSermonElements(sermonElements.map(el => 
      el.id === id ? { ...el, notes } : el
    ));
  };

  // Filter scriptures based on search
  const filteredScriptures = SAMPLE_SCRIPTURES.filter(s => 
    s.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.theme.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Filter hymns based on search and denomination
  const filteredHymns = SAMPLE_HYMNS.filter(h => {
    const matchesSearch = h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.themes.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDenom = selectedDenomination === 'All' || h.denominations.includes(selectedDenomination);
    return matchesSearch && matchesDenom;
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Book className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Sermon Helper</h1>
              <p className="text-sm text-gray-500">AI-powered sermon preparation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Est. time saved: 4-6 hours
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex px-6">
          {[
            { id: 'builder', label: 'Sermon Builder', icon: FileText },
            { id: 'scriptures', label: 'Scripture Search', icon: Book },
            { id: 'hymns', label: 'Hymn Finder', icon: Music },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Sermon Builder Tab */}
        {activeTab === 'builder' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel - Sermon Details & AI */}
            <div className="space-y-6">
              {/* Sermon Info */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Sermon Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={sermonTitle}
                      onChange={(e) => setSermonTitle(e.target.value)}
                      placeholder="Enter sermon title..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="date"
                        value={sermonDate}
                        onChange={(e) => setSermonDate(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Theme Search */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-sm border border-indigo-100 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <h2 className="font-semibold text-gray-900">AI Assistant</h2>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Enter your sermon theme and let AI suggest scriptures, hymns, and outline ideas.
                </p>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={sermonTheme}
                    onChange={(e) => setSermonTheme(e.target.value)}
                    placeholder="e.g., forgiveness, hope in trials, God's faithfulness..."
                    className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  />
                  <button
                    onClick={handleAISearch}
                    disabled={isLoadingAI || !sermonTheme.trim()}
                    className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoadingAI ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Finding suggestions...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Get AI Suggestions
                      </>
                    )}
                  </button>
                </div>

                {/* AI Suggestions */}
                {aiSuggestions && (
                  <div className="mt-4 space-y-3">
                    <div className="bg-white rounded-lg p-3 border border-indigo-100">
                      <h4 className="font-medium text-sm text-gray-900 mb-2">Suggested Scriptures</h4>
                      {aiSuggestions.scriptures?.map((s, i) => (
                        <div key={i} className="flex items-start justify-between py-1">
                          <div>
                            <span className="text-sm font-medium text-indigo-600">{s.reference}</span>
                            <p className="text-xs text-gray-500">{s.relevance}</p>
                          </div>
                          <button
                            onClick={() => addToSermon('scripture', s)}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-indigo-100">
                      <h4 className="font-medium text-sm text-gray-900 mb-2">Suggested Hymns</h4>
                      {aiSuggestions.hymns?.map((h, i) => (
                        <div key={i} className="flex items-start justify-between py-1">
                          <div>
                            <span className="text-sm font-medium text-indigo-600">{h.title}</span>
                            <p className="text-xs text-gray-500">{h.reason}</p>
                          </div>
                          <button
                            onClick={() => addToSermon('hymn', h)}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-indigo-100">
                      <h4 className="font-medium text-sm text-gray-900 mb-2">Outline Ideas</h4>
                      {aiSuggestions.outlineIdeas?.map((idea, i) => (
                        <div key={i} className="flex items-start justify-between py-1">
                          <span className="text-sm text-gray-700">{idea}</span>
                          <button
                            onClick={() => addToSermon('point', { text: idea })}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Center Panel - Sermon Outline */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900">Sermon Outline</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => addToSermon('section', { title: 'New Section' })}
                      className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add Section
                    </button>
                    <button
                      onClick={() => addToSermon('note', { text: '' })}
                      className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add Note
                    </button>
                  </div>
                </div>

                {sermonElements.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Your sermon outline is empty</p>
                    <p className="text-sm">Use AI suggestions or search to add content</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sermonElements.map((element, index) => (
                      <div
                        key={element.id}
                        className={`border rounded-lg p-4 ${
                          element.type === 'scripture' ? 'border-blue-200 bg-blue-50' :
                          element.type === 'hymn' ? 'border-purple-200 bg-purple-50' :
                          element.type === 'section' ? 'border-gray-300 bg-gray-100' :
                          'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => moveElement(index, 'up')}
                              disabled={index === 0}
                              className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                              <ChevronRight className="w-4 h-4 -rotate-90" />
                            </button>
                            <GripVertical className="w-4 h-4 text-gray-300" />
                            <button
                              onClick={() => moveElement(index, 'down')}
                              disabled={index === sermonElements.length - 1}
                              className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                              <ChevronRight className="w-4 h-4 rotate-90" />
                            </button>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {element.type === 'scripture' && <Book className="w-4 h-4 text-blue-600" />}
                              {element.type === 'hymn' && <Music className="w-4 h-4 text-purple-600" />}
                              {element.type === 'section' && <FileText className="w-4 h-4 text-gray-600" />}
                              {element.type === 'point' && <ChevronRight className="w-4 h-4 text-green-600" />}
                              {element.type === 'note' && <FileText className="w-4 h-4 text-yellow-600" />}
                              <span className="text-xs font-medium uppercase text-gray-500">
                                {element.type}
                              </span>
                            </div>
                            <div className="font-medium text-gray-900">
                              {element.type === 'scripture' && element.content.reference}
                              {element.type === 'hymn' && element.content.title}
                              {element.type === 'section' && element.content.title}
                              {element.type === 'point' && element.content.text}
                              {element.type === 'note' && (
                                <textarea
                                  value={element.content.text}
                                  onChange={(e) => {
                                    const updated = sermonElements.map(el =>
                                      el.id === element.id 
                                        ? { ...el, content: { ...el.content, text: e.target.value } }
                                        : el
                                    );
                                    setSermonElements(updated);
                                  }}
                                  placeholder="Enter your notes..."
                                  className="w-full p-2 border border-gray-300 rounded text-sm"
                                  rows={2}
                                />
                              )}
                            </div>
                            {element.content.relevance && (
                              <p className="text-sm text-gray-600 mt-1">{element.content.relevance}</p>
                            )}
                            {element.content.reason && (
                              <p className="text-sm text-gray-600 mt-1">{element.content.reason}</p>
                            )}
                          </div>
                          <button
                            onClick={() => removeFromSermon(element.id)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {sermonElements.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <button className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2">
                      <FileText className="w-5 h-5" />
                      Export Sermon
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Scripture Search Tab */}
        {activeTab === 'scriptures' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by reference, keyword, or theme..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {filteredScriptures.map((scripture, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-indigo-600">{scripture.reference}</h3>
                        <p className="text-gray-700 mt-1">{scripture.text}</p>
                        <div className="flex gap-2 mt-2">
                          {scripture.theme.map((t, i) => (
                            <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => addToSermon('scripture', { reference: scripture.reference, text: scripture.text })}
                        className="ml-4 bg-indigo-100 text-indigo-600 p-2 rounded-lg hover:bg-indigo-200"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Hymn Finder Tab */}
        {activeTab === 'hymns' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search hymns by title or theme..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <select
                  value={selectedDenomination}
                  onChange={(e) => setSelectedDenomination(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {DENOMINATIONS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                {filteredHymns.map((hymn, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-purple-600">{hymn.title}</h3>
                        <p className="text-sm text-gray-500">by {hymn.author}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {hymn.themes.map((t, i) => (
                            <span key={i} className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded">
                              {t}
                            </span>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {hymn.denominations.map((d, i) => (
                            <span key={i} className="text-xs text-gray-400">
                              {d}{i < hymn.denominations.length - 1 ? ' • ' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => addToSermon('hymn', { title: hymn.title, author: hymn.author })}
                        className="ml-4 bg-purple-100 text-purple-600 p-2 rounded-lg hover:bg-purple-200"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
