import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/Label';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { CheckCircle2, Trash2, Plus, X } from 'lucide-react';
import { aiModelMetrics } from '../data/mock';

interface Rule {
  id: string;
  condition: string;
  operator: string;
  value: string;
  action: string;
}

const defaultRules: Rule[] = [
  { id: '1', condition: 'Match score', operator: '<', value: '90', action: 'Require manual review' },
  { id: '2', condition: 'CGST variance', operator: '>', value: '2%', action: 'Flag for review' },
  { id: '3', condition: 'Vendor risk score', operator: '>', value: '80', action: 'Block auto-accept' },
];

export default function Settings() {
  // Profile settings
  const [name, setName] = useState(() => localStorage.getItem('user_profile_name') || 'Priya Sharma');
  const [email, setEmail] = useState(() => localStorage.getItem('user_profile_email') || 'priya@acmecorp.in');
  const [company, setCompany] = useState(() => localStorage.getItem('user_profile_company') || 'Acme Corp Pvt Ltd');
  const [gstin, setGstin] = useState(() => localStorage.getItem('user_profile_gstin') || '27AABCA1234F1Z5');
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Model settings
  const [model, setModel] = useState(() => localStorage.getItem('ai_reconciliation_model') || 'llama3.2:1b');

  // Rules Engine settings
  const [rules, setRules] = useState<Rule[]>(() => {
    const stored = localStorage.getItem('reconciliation_rules');
    return stored ? JSON.parse(stored) : defaultRules;
  });
  const [showAddRuleForm, setShowAddRuleForm] = useState(false);
  const [newCondition, setNewCondition] = useState('Match score');
  const [newOperator, setNewOperator] = useState('<');
  const [newValue, setNewValue] = useState('');
  const [newAction, setNewAction] = useState('Require manual review');

  // Notification Preferences
  const [notifs, setNotifs] = useState(() => {
    const stored = localStorage.getItem('notification_preferences');
    return stored ? JSON.parse(stored) : [
      { label: 'Fraud alerts', email: true, whatsapp: true },
      { label: 'Reconciliation complete', email: true, whatsapp: false },
      { label: 'Notice deadlines', email: true, whatsapp: true },
      { label: 'Weekly summary', email: true, whatsapp: false },
    ];
  });

  const handleSaveProfile = () => {
    localStorage.setItem('user_profile_name', name);
    localStorage.setItem('user_profile_email', email);
    localStorage.setItem('user_profile_company', company);
    localStorage.setItem('user_profile_gstin', gstin);

    // Propagate changes via window custom event
    window.dispatchEvent(new Event('profileUpdate'));

    setProfileSuccess(true);
    setTimeout(() => setProfileSuccess(false), 3000);
  };

  const handleModelChange = (val: string) => {
    setModel(val);
    localStorage.setItem('ai_reconciliation_model', val);
  };

  const saveRules = (updatedRules: Rule[]) => {
    setRules(updatedRules);
    localStorage.setItem('reconciliation_rules', JSON.stringify(updatedRules));
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue.trim()) return;

    const newRule: Rule = {
      id: Date.now().toString(),
      condition: newCondition,
      operator: newOperator,
      value: newValue.trim(),
      action: newAction,
    };

    saveRules([...rules, newRule]);
    setShowAddRuleForm(false);
    setNewValue('');
  };

  const handleDeleteRule = (id: string) => {
    saveRules(rules.filter((r) => r.id !== id));
  };

  const handleNotifToggle = (index: number, channel: 'email' | 'whatsapp') => {
    const updated = [...notifs];
    updated[index][channel] = !updated[index][channel];
    setNotifs(updated);
    localStorage.setItem('notification_preferences', JSON.stringify(updated));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-24">
      {profileSuccess && (
        <div className="flex items-center gap-12 rounded-card bg-emerald-50 border border-emerald-200 p-16 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400">
          <CheckCircle2 className="shrink-0 text-emerald-600 dark:text-emerald-400" size={20} />
          <p className="text-body-sm font-semibold">Compliance Profile successfully saved &amp; propagated globally!</p>
        </div>
      )}

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <div className="grid gap-16 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="company">Company</Label>
            <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="gstin">GSTIN</Label>
            <Input id="gstin" value={gstin} onChange={(e) => setGstin(e.target.value)} className="font-mono uppercase" />
          </div>
        </div>
        <Button className="mt-20" onClick={handleSaveProfile} variant="primary">
          Save profile
        </Button>
      </Card>

      {/* AI Model Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-12">
          <CardTitle>AI Model Configurations</CardTitle>
          <Badge variant="info">Spring AI Tier</Badge>
        </CardHeader>
        <div className="grid gap-16 sm:grid-cols-2">
          <div className="rounded-card border border-gray-200 bg-gray-50 p-20 dark:border-border-dark dark:bg-gray-900/30">
            <p className="text-body-sm text-gray-600 dark:text-[#A0A0A0]">Accuracy</p>
            <p className="mt-8 font-mono text-[28px] font-bold text-success">
              {aiModelMetrics.accuracy}%
            </p>
          </div>
          <div className="rounded-card border border-gray-200 bg-gray-50 p-20 dark:border-border-dark dark:bg-gray-900/30">
            <p className="text-body-sm text-gray-600 dark:text-[#A0A0A0]">False positives</p>
            <p className="mt-8 font-mono text-[28px] font-bold text-indigo-600 dark:text-indigo-400">
              {aiModelMetrics.falsePositives}%
            </p>
          </div>
        </div>
        <div className="mt-16">
          <Label htmlFor="model">Reconciliation model</Label>
          <Select id="model" value={model} onChange={(e) => handleModelChange(e.target.value)}>
            <option value="llama3.2:1b">Ollama Llama 3.2 1B (Local Host — Recommended)</option>
            <option value="gpt-4">GPT-4 Turbo (Cloud Gateway)</option>
            <option value="claude">Claude 3.5 Sonnet (Enterprise Sync)</option>
          </Select>
        </div>
      </Card>

      {/* Rules Engine Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-gray-150 dark:border-border-dark pb-16 mb-20">
          <div>
            <CardTitle>Compliance Rules Engine</CardTitle>
            <p className="text-body-xs text-gray-500 mt-4">
              Configure parameters that trigger manual audits or automatic transaction reversals.
            </p>
          </div>
          {!showAddRuleForm && (
            <Button variant="secondary" className="!px-12 !py-8 flex items-center gap-4" onClick={() => setShowAddRuleForm(true)}>
              <Plus size={16} />
              Add rule
            </Button>
          )}
        </CardHeader>

        {showAddRuleForm && (
          <form onSubmit={handleAddRule} className="mb-24 p-16 rounded-card border border-indigo-100 bg-indigo-50/5 dark:border-indigo-950/20 dark:bg-slate-900/40 space-y-16">
            <div className="flex justify-between items-center pb-8 border-b border-indigo-50 dark:border-indigo-950/10">
              <h4 className="text-body-sm font-bold text-indigo-950 dark:text-white">Configure New Rule</h4>
              <button type="button" onClick={() => setShowAddRuleForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <div className="grid gap-12 sm:grid-cols-2 md:grid-cols-4">
              <div>
                <Label htmlFor="new-cond">Condition</Label>
                <Select id="new-cond" value={newCondition} onChange={(e) => setNewCondition(e.target.value)}>
                  <option value="Match score">Match score</option>
                  <option value="CGST variance">CGST variance</option>
                  <option value="Vendor risk score">Vendor risk score</option>
                  <option value="Tax difference">Tax difference</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="new-op">Operator</Label>
                <Select id="new-op" value={newOperator} onChange={(e) => setNewOperator(e.target.value)}>
                  <option value="<">&lt;</option>
                  <option value=">">&gt;</option>
                  <option value="==">==</option>
                  <option value="!=">!=</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="new-val">Value</Label>
                <Input id="new-val" type="text" placeholder="e.g. 90 or 2%" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="new-act">Action</Label>
                <Select id="new-act" value={newAction} onChange={(e) => setNewAction(e.target.value)}>
                  <option value="Require manual review">Require manual review</option>
                  <option value="Flag for review">Flag for review</option>
                  <option value="Block auto-accept">Block auto-accept</option>
                  <option value="Auto-resolve">Auto-resolve</option>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-12 pt-8">
              <Button type="button" variant="secondary" onClick={() => setShowAddRuleForm(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Save Rule
              </Button>
            </div>
          </form>
        )}

        <ul className="space-y-12">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="flex items-center justify-between gap-12 rounded-button border border-gray-200 px-16 py-12 dark:border-border-dark hover:bg-gray-50/20"
            >
              <div className="flex flex-wrap items-center gap-12">
                <span className="rounded-badge bg-gray-100 px-8 py-4 font-mono text-body-sm dark:bg-gray-800 text-slate-500">
                  IF
                </span>
                <span className="text-body font-semibold text-primary dark:text-primary-light">{rule.condition}</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{rule.operator}</span>
                <span className="font-mono text-body font-bold bg-indigo-50/40 dark:bg-indigo-950/20 px-8 py-2 rounded border border-indigo-100/20">{rule.value}</span>
                <span className="rounded-badge bg-gray-100 px-8 py-4 font-mono text-body-sm dark:bg-gray-800 text-slate-500">
                  THEN
                </span>
                <span className="text-body text-slate-600 dark:text-[#A0A0A0]">{rule.action}</span>
              </div>
              <button
                type="button"
                className="text-red-500 hover:text-red-700 p-8 rounded hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                onClick={() => handleDeleteRule(rule.id)}
                title="Delete rule"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {/* Notifications Card */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <ul className="space-y-12">
          {notifs.map((pref: any, index: number) => (
            <li
              key={pref.label}
              className="flex flex-wrap items-center justify-between gap-12 rounded-button border border-gray-200 px-16 py-12 dark:border-border-dark"
            >
              <span className="text-body font-medium text-primary dark:text-primary-light">
                {pref.label}
              </span>
              <div className="flex gap-16 text-body-sm text-gray-600">
                <label className="flex items-center gap-8 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={pref.email}
                    className="accent-indigo-600 w-16 h-16"
                    onChange={() => handleNotifToggle(index, 'email')}
                  />
                  <span className="dark:text-[#A0A0A0]">Email</span>
                </label>
                <label className="flex items-center gap-8 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={pref.whatsapp}
                    className="accent-indigo-600 w-16 h-16"
                    onChange={() => handleNotifToggle(index, 'whatsapp')}
                  />
                  <span className="dark:text-[#A0A0A0]">WhatsApp</span>
                </label>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
