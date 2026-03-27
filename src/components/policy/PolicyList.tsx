import React from 'react';
import { format } from 'date-fns';
import { Shield, Clock, Users, Building2, MoreVertical, Edit, Trash2, Power, PowerOff, Eye, Globe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Policy } from '@/types/policy';

interface PolicyListProps {
  policies: Policy[];
  onEdit: (policy: Policy) => void;
  onDelete: (policy: Policy) => void;
  onToggleActive: (policy: Policy) => void;
  onViewAssignments: (policy: Policy) => void;
  onManageBlockedUrls: (policy: Policy) => void;
}

const PolicyList: React.FC<PolicyListProps> = ({
  policies,
  onEdit,
  onDelete,
  onToggleActive,
  onViewAssignments,
  onManageBlockedUrls,
}) => {
  const isCurrentlyActive = (policy: Policy) => {
    const now = new Date();
    return policy.is_active && 
           new Date(policy.start_time) <= now && 
           new Date(policy.end_time) >= now;
  };

  const getStatusBadge = (policy: Policy) => {
    if (!policy.is_active) {
      return <Badge variant="secondary" className="bg-muted text-muted-foreground">Disabled</Badge>;
    }
    
    const now = new Date();
    const start = new Date(policy.start_time);
    const end = new Date(policy.end_time);
    
    if (now < start) {
      return <Badge variant="outline" className="border-amber-500 text-amber-600">Scheduled</Badge>;
    } else if (now > end) {
      return <Badge variant="secondary" className="bg-muted text-muted-foreground">Ended</Badge>;
    } else {
      return <Badge className="bg-green-500 hover:bg-green-600 text-white">Active Now</Badge>;
    }
  };

  const getTypeBadge = (policy: Policy) => {
    if (policy.policy_type === 'exam') {
      return <Badge variant="default" className="bg-primary">Exam</Badge>;
    }
    return <Badge variant="outline" className="border-primary text-primary">Focus</Badge>;
  };

  const getEnforcementBadge = (policy: Policy) => {
    if (policy.enforcement_level === 'strict') {
      return <Badge variant="destructive" className="text-xs">Strict</Badge>;
    }
    return <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">Soft</Badge>;
  };

  if (policies.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">No policies yet</h3>
          <p className="text-muted-foreground text-sm">
            Create your first exam or focus policy to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {policies.map((policy) => (
        <Card 
          key={policy.id} 
          className={`transition-all ${isCurrentlyActive(policy) ? 'border-green-500/50 bg-green-500/5' : ''}`}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              {/* Main Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 className="font-semibold text-foreground truncate">{policy.title}</h3>
                  {getStatusBadge(policy)}
                  {getTypeBadge(policy)}
                  {getEnforcementBadge(policy)}
                </div>
                
                {policy.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {policy.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {format(new Date(policy.start_time), 'MMM d, h:mm a')} - {format(new Date(policy.end_time), 'MMM d, h:mm a')}
                  </span>
                  
                  <span className="flex items-center gap-1">
                    {policy.assignment_type === 'institution' ? (
                      <>
                        <Building2 className="w-4 h-4" />
                        Institution-wide
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4" />
                        Individual
                      </>
                    )}
                  </span>
                </div>

                {/* Blocked Categories */}
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Blocks:</span>
                  {policy.blocked_categories.slice(0, 4).map((cat) => (
                    <Badge key={cat} variant="outline" className="text-xs">
                      {cat}
                    </Badge>
                  ))}
                  {policy.blocked_categories.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{policy.blocked_categories.length - 4} more
                    </Badge>
                  )}
                </div>
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onManageBlockedUrls(policy)}>
                    <Globe className="w-4 h-4 mr-2" />
                    Manage Blocked URLs
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onViewAssignments(policy)}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Assignments
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(policy)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Policy
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onToggleActive(policy)}>
                    {policy.is_active ? (
                      <>
                        <PowerOff className="w-4 h-4 mr-2" />
                        Disable Policy
                      </>
                    ) : (
                      <>
                        <Power className="w-4 h-4 mr-2" />
                        Enable Policy
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDelete(policy)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Policy
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PolicyList;
