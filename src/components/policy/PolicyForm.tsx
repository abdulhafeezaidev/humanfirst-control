import React, { useState, useEffect } from 'react';
import { Shield, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import type { Policy, PolicyFormData, PolicyType, EnforcementLevel, AssignmentType } from '@/types/policy';
import { BLOCKED_CATEGORIES, BLOCKED_SERVICES } from '@/types/policy';

interface PolicyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PolicyFormData) => Promise<void>;
  policy?: Policy | null;
  isLoading?: boolean;
}

const PolicyForm: React.FC<PolicyFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  policy,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<PolicyFormData>({
    title: '',
    description: '',
    policy_type: 'exam',
    enforcement_level: 'strict',
    assignment_type: 'institution',
    start_time: '',
    end_time: '',
    blocked_categories: ['AI Tools'],
    blocked_services: [],
  });

  useEffect(() => {
    if (policy) {
      // Convert UTC times from Supabase to local datetime-local format
      const toLocalDatetimeString = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      setFormData({
        title: policy.title,
        description: policy.description || '',
        policy_type: policy.policy_type,
        enforcement_level: policy.enforcement_level,
        assignment_type: policy.assignment_type,
        start_time: toLocalDatetimeString(new Date(policy.start_time)),
        end_time: toLocalDatetimeString(new Date(policy.end_time)),
        blocked_categories: policy.blocked_categories,
        blocked_services: policy.blocked_services,
      });
    } else {
      // Default for new policy
      const now = new Date();
      now.setHours(now.getHours() + 1, 0, 0, 0);
      const endTime = new Date(now);
      endTime.setHours(endTime.getHours() + 2);

      // datetime-local input expects local time in "YYYY-MM-DDTHH:mm" format
      const toLocalDatetimeString = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      setFormData({
        title: '',
        description: '',
        policy_type: 'exam',
        enforcement_level: 'strict',
        assignment_type: 'institution',
        start_time: toLocalDatetimeString(now),
        end_time: toLocalDatetimeString(endTime),
        blocked_categories: ['AI Tools'],
        blocked_services: [],
      });
    }
  }, [policy, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: end_time must be after start_time
    const startDate = new Date(formData.start_time);
    const endDate = new Date(formData.end_time);
    
    if (endDate <= startDate) {
      alert('End time must be after start time');
      return;
    }
    
    // Validation: at least one blocked category required
    if (formData.blocked_categories.length === 0) {
      alert('Please select at least one blocked category');
      return;
    }
    
    await onSubmit(formData);
    onOpenChange(false);
  };

  const toggleCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      blocked_categories: prev.blocked_categories.includes(category)
        ? prev.blocked_categories.filter(c => c !== category)
        : [...prev.blocked_categories, category],
    }));
  };

  const toggleService = (service: string) => {
    setFormData(prev => ({
      ...prev,
      blocked_services: prev.blocked_services.includes(service)
        ? prev.blocked_services.filter(s => s !== service)
        : [...prev.blocked_services, service],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            {policy ? 'Edit Policy' : 'Create New Policy'}
          </DialogTitle>
          <DialogDescription>
            {policy ? 'Update the policy settings below.' : 'Create a new exam or focus policy for your institution.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Policy Name *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Math 101 Midterm Exam"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description for this policy"
                rows={2}
              />
            </div>
          </div>

          {/* Policy Type */}
          <div className="space-y-3">
            <Label>Policy Type *</Label>
            <RadioGroup
              value={formData.policy_type}
              onValueChange={(value: PolicyType) => {
                setFormData({
                  ...formData,
                  policy_type: value,
                  enforcement_level: value === 'exam' ? 'strict' : formData.enforcement_level,
                });
              }}
              className="grid grid-cols-2 gap-4"
            >
              <label 
                className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  formData.policy_type === 'exam' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
              >
                <RadioGroupItem value="exam" className="mt-1" />
                <div>
                  <p className="font-medium">Exam Policy</p>
                  <p className="text-sm text-muted-foreground">
                    Strict enforcement, blocks all AI tools. Takes priority over Focus policies.
                  </p>
                </div>
              </label>
              <label 
                className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  formData.policy_type === 'focus' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
              >
                <RadioGroupItem value="focus" className="mt-1" />
                <div>
                  <p className="font-medium">Focus Policy</p>
                  <p className="text-sm text-muted-foreground">
                    Flexible enforcement, admin-defined overrides. Lower priority than Exam.
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* Enforcement Level */}
          <div className="space-y-3">
            <Label>Enforcement Level *</Label>
            <RadioGroup
              value={formData.enforcement_level}
              onValueChange={(value: EnforcementLevel) => setFormData({ ...formData, enforcement_level: value })}
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="strict" disabled={formData.policy_type === 'exam'} />
                <span className={formData.policy_type === 'exam' ? 'text-muted-foreground' : ''}>
                  Strict (no bypass)
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="soft" disabled={formData.policy_type === 'exam'} />
                <span className={formData.policy_type === 'exam' ? 'text-muted-foreground' : ''}>
                  Soft (warnings only)
                </span>
              </label>
            </RadioGroup>
            {formData.policy_type === 'exam' && (
              <p className="text-xs text-muted-foreground">
                Exam policies always use strict enforcement.
              </p>
            )}
          </div>

          {/* Assignment Type */}
          <div className="space-y-3">
            <Label>Assignment Type *</Label>
            <RadioGroup
              value={formData.assignment_type}
              onValueChange={(value: AssignmentType) => setFormData({ ...formData, assignment_type: value })}
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="institution" />
                <span>Institution-wide (all students)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="individual" />
                <span>Individual students</span>
              </label>
            </RadioGroup>
          </div>

          {/* Time Window */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">End Time *</Label>
              <Input
                id="end_time"
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Blocked Categories */}
          <div className="space-y-3">
            <Label>Blocked Categories</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BLOCKED_CATEGORIES.map((category) => (
                <label
                  key={category}
                  className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-muted/50"
                >
                  <Checkbox
                    checked={formData.blocked_categories.includes(category)}
                    onCheckedChange={() => toggleCategory(category)}
                  />
                  <span className="text-sm">{category}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Blocked Services */}
          <div className="space-y-3">
            <Label>Blocked AI Services (Optional)</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BLOCKED_SERVICES.map((service) => (
                <label
                  key={service}
                  className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-muted/50"
                >
                  <Checkbox
                    checked={formData.blocked_services.includes(service)}
                    onCheckedChange={() => toggleService(service)}
                  />
                  <span className="text-sm">{service}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Ethics Notice */}
          <Alert className="border-primary/20 bg-primary/5">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              <strong>Privacy First:</strong> HumanFirst does not read content, monitor keystrokes, or score behavior. 
              Only focus mode compliance is tracked.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : policy ? 'Update Policy' : 'Create Policy'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PolicyForm;
