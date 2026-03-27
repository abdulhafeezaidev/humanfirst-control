import { Bot, Lock } from 'lucide-react';

interface BlockedService {
  id: string;
  name: string;
  category: string;
}

interface BlockedServicesCardProps {
  services: BlockedService[];
  enforcementStatus: 'not_connected' | 'connected_simulated' | 'active';
}

const BlockedServicesCard = ({ services, enforcementStatus }: BlockedServicesCardProps) => {
  if (services.length === 0) return null;

  // Group services by category
  const groupedServices = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, BlockedService[]>);

  return (
    <div className="glass-card p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground">Restricted Services</h3>
          <p className="text-sm text-muted-foreground">
            The following AI services are restricted during this policy period.
          </p>
          {enforcementStatus !== 'active' && (
            <p className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Policy-based restriction (compliance expected)
            </p>
          )}
        </div>
      </div>

      {/* Services grouped by category */}
      <div className="space-y-4">
        {Object.entries(groupedServices).map(([category, categoryServices]) => (
          <div key={category}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {category}
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {categoryServices.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center gap-2 p-3 bg-destructive/5 border border-destructive/10 rounded-lg"
                >
                  <div className="w-2 h-2 bg-destructive rounded-full flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate">
                    {service.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BlockedServicesCard;
