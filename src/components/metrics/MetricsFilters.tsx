/**
 * Metrics Dashboard Filters
 * 
 * Allows filtering by date period and policy type.
 * Read-only, no data modification capabilities.
 */

import React from 'react';
import { Calendar, Filter, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MetricsPeriod, METRICS_PERIODS } from '@/types/metrics';

interface MetricsFiltersProps {
  period: MetricsPeriod;
  onPeriodChange: (period: MetricsPeriod) => void;
  policyFilter: string;
  onPolicyFilterChange: (policy: string) => void;
  availablePolicies: { id: string; title: string; type: string }[];
  onRefresh: () => void;
  isLoading?: boolean;
}

const MetricsFilters: React.FC<MetricsFiltersProps> = ({
  period,
  onPeriodChange,
  policyFilter,
  onPolicyFilterChange,
  availablePolicies,
  onRefresh,
  isLoading = false,
}) => {
  const handlePeriodChange = (value: string) => {
    const selected = METRICS_PERIODS.find(p => p.value === value);
    if (selected) {
      onPeriodChange(selected);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Date Period Filter */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Select value={period.value} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            {METRICS_PERIODS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Policy Type Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={policyFilter} onValueChange={onPolicyFilterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All policies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Policies</SelectItem>
            <SelectItem value="exam">Exam Policies</SelectItem>
            <SelectItem value="focus">Focus Policies</SelectItem>
            <SelectItem value="custom">Custom Policies</SelectItem>
            {availablePolicies.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
                  Specific Policies
                </div>
                {availablePolicies.slice(0, 5).map((policy) => (
                  <SelectItem key={policy.id} value={policy.id}>
                    {policy.title}
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Refresh Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isLoading}
        className="ml-auto"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );
};

export default MetricsFilters;
