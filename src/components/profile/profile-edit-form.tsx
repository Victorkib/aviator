'use client';

import type React from 'react';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, X } from 'lucide-react';

interface ProfileData {
  id: string;
  username: string | null;
  display_name: string | null;
  email: string;
  bio: string | null;
  avatar_url: string | null;
  balance: number;
  created_at: string;
  total_bets: number;
  total_winnings: number;
  win_rate: number;
}

export function ProfileEditForm() {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null
  );
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    username: '',
    display_name: '',
    bio: '',
    avatar_url: '',
  });

  // Load profile data
  useEffect(() => {
    if (session?.user?.id) {
      loadProfile();
    }
  }, [session]);

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      const result = await response.json();

      if (result.success) {
        setProfile(result.data);
        setFormData({
          username: result.data.username || '',
          display_name: result.data.display_name || '',
          bio: result.data.bio || '',
          avatar_url: result.data.avatar_url || '',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to load profile',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Check username availability with debouncing
  useEffect(() => {
    if (!formData.username || formData.username === profile?.username) {
      setUsernameAvailable(null);
      setUsernameSuggestions([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      checkUsernameAvailability(formData.username);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.username, profile?.username]);

  const checkUsernameAvailability = async (username: string) => {
    if (username.length < 3) {
      setUsernameAvailable(false);
      return;
    }

    setCheckingUsername(true);
    try {
      const response = await fetch('/api/user/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      const result = await response.json();

      if (result.success) {
        setUsernameAvailable(result.available);
        setUsernameSuggestions(result.suggestions || []);
      }
    } catch (error) {
      console.error('Error checking username:', error);
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.username && usernameAvailable === false) {
      toast({
        title: 'Error',
        description: 'Please choose an available username',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setProfile(result.data);
        toast({
          title: 'Success',
          description: 'Profile updated successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update profile',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const selectSuggestion = (suggestion: string) => {
    setFormData((prev) => ({ ...prev, username: suggestion }));
    setUsernameSuggestions([]);
  };

  // Calculate if form should be disabled
  const isFormDisabled =
    saving || (formData.username !== '' && usernameAvailable === false);

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8">
          <p className="text-center text-muted-foreground">
            Failed to load profile
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Profile Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar_url || ''} />
              <AvatarFallback>
                {profile.display_name?.[0] ||
                  profile.username?.[0] ||
                  profile.email[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-semibold">
                {profile.display_name || profile.username || 'Anonymous User'}
              </h3>
              <p className="text-muted-foreground">{profile.email}</p>
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="secondary">
                  Balance: ${profile.balance.toFixed(2)}
                </Badge>
                <Badge variant="outline">Bets: {profile.total_bets}</Badge>
                <Badge variant="outline">
                  Win Rate: {profile.win_rate.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
          <CardDescription>
            Update your profile information and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) =>
                    handleInputChange('username', e.target.value)
                  }
                  placeholder="Enter username"
                  className={
                    formData.username && formData.username !== profile.username
                      ? usernameAvailable === true
                        ? 'border-green-500'
                        : usernameAvailable === false
                        ? 'border-red-500'
                        : ''
                      : ''
                  }
                />
                {checkingUsername && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />
                )}
                {!checkingUsername &&
                  formData.username &&
                  formData.username !== profile.username && (
                    <div className="absolute right-3 top-3">
                      {usernameAvailable === true && (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                      {usernameAvailable === false && (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  )}
              </div>

              {/* Username suggestions */}
              {usernameSuggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Suggestions:</p>
                  <div className="flex flex-wrap gap-2">
                    {usernameSuggestions.map((suggestion) => (
                      <Button
                        key={suggestion}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => selectSuggestion(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) =>
                  handleInputChange('display_name', e.target.value)
                }
                placeholder="Enter display name"
                maxLength={50}
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell us about yourself..."
                maxLength={500}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {formData.bio.length}/500 characters
              </p>
            </div>

            {/* Avatar URL */}
            <div className="space-y-2">
              <Label htmlFor="avatar_url">Avatar URL</Label>
              <Input
                id="avatar_url"
                type="url"
                value={formData.avatar_url}
                onChange={(e) =>
                  handleInputChange('avatar_url', e.target.value)
                }
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            <Button type="submit" disabled={isFormDisabled} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
