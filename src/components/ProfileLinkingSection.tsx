import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { UserPlus, UserX, Link2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { usePortfolio } from '../store/PortfolioContext';
import { linkProfileToMember, unlinkProfileFromMember, getMemberProfiles, type MemberProfile } from '../lib/profileLinking';

export function ProfileLinkingSection() {
  const { user } = useAuth();
  const { members, activePortfolioId } = usePortfolio();
  const [profiles, setProfiles] = React.useState<MemberProfile[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [linkingEmail, setLinkingEmail] = React.useState('');

  React.useEffect(() => {
    if (!activePortfolioId) return;
    void getMemberProfiles(activePortfolioId).then((result) => {
      setProfiles(result.profiles);
    }).catch(() => {});
  }, [activePortfolioId]);

  const linkedEmails = new Set(profiles.map((p) => p.email));
  const unlinkedMembers = members.filter((m) => !linkedEmails.has(m.email.toLowerCase()));

  const handleLink = async () => {
    if (!activePortfolioId || !linkingEmail.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await linkProfileToMember(activePortfolioId, {
        memberEmail: linkingEmail.trim().toLowerCase(),
        displayName: linkingEmail.trim().split('@')[0],
      });
      if (result.ok) {
        const updated = await getMemberProfiles(activePortfolioId);
        setProfiles(updated.profiles);
        setLinkingEmail('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link profile');
    } finally {
      setBusy(false);
    }
  };

  const handleUnlink = async (email: string) => {
    if (!activePortfolioId) return;
    setBusy(true);
    setError(null);
    try {
      await unlinkProfileFromMember(activePortfolioId, email);
      const updated = await getMemberProfiles(activePortfolioId);
      setProfiles(updated.profiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlink profile');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Member Profiles
        </CardTitle>
        <CardDescription>
          Link display names and avatars to portfolio members for better identification.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {profiles.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Linked Profiles</div>
            {profiles.map((profile) => (
              <div key={profile.email} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                    {(profile.displayName || profile.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{profile.displayName || profile.email}</div>
                    <div className="text-xs text-slate-500">{profile.email}</div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleUnlink(profile.email)}
                  disabled={busy}
                >
                  <UserX className="h-4 w-4 text-slate-400" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {unlinkedMembers.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Unlinked Members</div>
            {unlinkedMembers.map((member) => (
              <div key={member.email} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                    {member.email[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-slate-600">{member.email}</div>
                    <div className="text-xs text-slate-400">{member.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="Enter member email to link..."
            value={linkingEmail}
            onChange={(e) => setLinkingEmail(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={handleLink}
            disabled={busy || !linkingEmail.trim() || !activePortfolioId}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
