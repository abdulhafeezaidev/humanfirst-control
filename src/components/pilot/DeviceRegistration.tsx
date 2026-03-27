import React, { useState, useEffect } from 'react';
import { 
  Laptop, Smartphone, Tablet, Monitor, CheckCircle, XCircle, 
  RefreshCw, Trash2, Plus, Clock, Shield, Fingerprint, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export interface RegisteredDevice {
  id: string;
  deviceId: string;
  name: string;
  type: 'laptop' | 'desktop' | 'tablet' | 'phone' | 'unknown';
  browser: string;
  os: string;
  registeredAt: number;
  lastActiveAt: number;
  trustScore?: number;
  isCurrentDevice: boolean;
}

interface DeviceRegistrationProps {
  userId: string;
  devices: RegisteredDevice[];
  maxDevices?: number;
  onRegisterDevice?: (device: Omit<RegisteredDevice, 'id' | 'registeredAt' | 'lastActiveAt' | 'isCurrentDevice'>) => void;
  onRemoveDevice?: (deviceId: string) => void;
  onRefreshDevices?: () => void;
}

const DeviceRegistration: React.FC<DeviceRegistrationProps> = ({
  userId,
  devices,
  maxDevices = 3,
  onRegisterDevice,
  onRemoveDevice,
  onRefreshDevices
}) => {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [customName, setCustomName] = useState('');
  const [detectedDevice, setDetectedDevice] = useState<{
    type: RegisteredDevice['type'];
    browser: string;
    os: string;
    deviceId: string;
  } | null>(null);

  // Detect current device info
  useEffect(() => {
    const detectDevice = () => {
      const ua = navigator.userAgent;
      
      // Detect device type
      let type: RegisteredDevice['type'] = 'unknown';
      if (/tablet|ipad/i.test(ua)) {
        type = 'tablet';
      } else if (/mobile|iphone|android(?!.*tablet)/i.test(ua)) {
        type = 'phone';
      } else if (/windows|mac|linux/i.test(ua)) {
        type = 'laptop'; // Default desktop/laptop
      }
      
      // Detect browser
      let browser = 'Unknown';
      if (/chrome/i.test(ua) && !/edg/i.test(ua)) browser = 'Chrome';
      else if (/firefox/i.test(ua)) browser = 'Firefox';
      else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
      else if (/edg/i.test(ua)) browser = 'Edge';
      
      // Detect OS
      let os = 'Unknown';
      if (/windows/i.test(ua)) os = 'Windows';
      else if (/mac/i.test(ua)) os = 'macOS';
      else if (/linux/i.test(ua)) os = 'Linux';
      else if (/android/i.test(ua)) os = 'Android';
      else if (/iphone|ipad/i.test(ua)) os = 'iOS';
      
      // Get or generate device ID
      const storageKey = 'humanfirst_device_id';
      let deviceId = localStorage.getItem(storageKey);
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem(storageKey, deviceId);
      }
      
      setDetectedDevice({ type, browser, os, deviceId });
    };
    
    detectDevice();
  }, []);

  const getDeviceIcon = (type: RegisteredDevice['type']) => {
    switch (type) {
      case 'laptop': return Laptop;
      case 'desktop': return Monitor;
      case 'tablet': return Tablet;
      case 'phone': return Smartphone;
      default: return Monitor;
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeSince = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const handleRegister = () => {
    if (!detectedDevice) return;
    
    if (devices.length >= maxDevices) {
      toast({
        title: 'Device limit reached',
        description: `You can only register up to ${maxDevices} devices. Please remove one first.`,
        variant: 'destructive',
      });
      return;
    }

    const isAlreadyRegistered = devices.some(d => d.deviceId === detectedDevice.deviceId);
    if (isAlreadyRegistered) {
      toast({
        title: 'Device already registered',
        description: 'This device is already registered to your account.',
        variant: 'destructive',
      });
      return;
    }

    onRegisterDevice?.({
      deviceId: detectedDevice.deviceId,
      name: customName || `${detectedDevice.os} ${detectedDevice.browser}`,
      type: detectedDevice.type,
      browser: detectedDevice.browser,
      os: detectedDevice.os,
    });

    setShowAddDialog(false);
    setCustomName('');
    toast({
      title: 'Device registered',
      description: 'This device has been registered for exam monitoring.',
    });
  };

  const handleRemove = (deviceId: string) => {
    onRemoveDevice?.(deviceId);
    toast({
      title: 'Device removed',
      description: 'The device has been unregistered.',
    });
  };

  const currentDeviceRegistered = detectedDevice && devices.some(d => d.deviceId === detectedDevice.deviceId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Fingerprint className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Registered Devices</CardTitle>
              <CardDescription>
                {devices.length} of {maxDevices} devices registered
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onRefreshDevices}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={devices.length >= maxDevices || currentDeviceRegistered}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add This Device
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Register This Device</DialogTitle>
                  <DialogDescription>
                    Register this device to participate in monitored exams
                  </DialogDescription>
                </DialogHeader>
                
                {detectedDevice && (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex items-center gap-3">
                        {React.createElement(getDeviceIcon(detectedDevice.type), {
                          className: 'w-8 h-8 text-primary'
                        })}
                        <div>
                          <p className="font-medium">{detectedDevice.os} • {detectedDevice.browser}</p>
                          <p className="text-sm text-muted-foreground">
                            Device ID: {detectedDevice.deviceId.slice(0, 20)}...
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="deviceName">Device Name (Optional)</Label>
                      <Input
                        id="deviceName"
                        placeholder={`${detectedDevice.os} ${detectedDevice.browser}`}
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Give this device a friendly name for easy identification
                      </p>
                    </div>

                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">Privacy note:</strong> Device registration 
                        only stores a unique identifier. We don't collect hardware IDs, serial numbers, 
                        or any personal device information.
                      </p>
                    </div>
                  </div>
                )}
                
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleRegister}>
                    Register Device
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {devices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Monitor className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No devices registered yet</p>
            <p className="text-sm">Click "Add This Device" to register your first device</p>
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => {
              const DeviceIcon = getDeviceIcon(device.type);
              
              return (
                <div
                  key={device.id}
                  className={`p-4 rounded-lg border ${
                    device.isCurrentDevice 
                      ? 'border-primary/50 bg-primary/5' 
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      device.isCurrentDevice ? 'bg-primary/10' : 'bg-muted'
                    }`}>
                      <DeviceIcon className={`w-5 h-5 ${
                        device.isCurrentDevice ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{device.name}</p>
                        {device.isCurrentDevice && (
                          <Badge variant="default" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{device.os} • {device.browser}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getTimeSince(device.lastActiveAt)}
                        </span>
                      </div>
                    </div>

                    {device.trustScore !== undefined && (
                      <Badge 
                        variant="outline"
                        className={
                          device.trustScore >= 80 ? 'border-green-300 text-green-700' :
                          device.trustScore >= 60 ? 'border-yellow-300 text-yellow-700' :
                          'border-red-300 text-red-700'
                        }
                      >
                        <Shield className="w-3 h-3 mr-1" />
                        {device.trustScore}
                      </Badge>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(device.deviceId)}
                      disabled={device.isCurrentDevice && devices.length === 1}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Help text */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <p>
            <Globe className="w-4 h-4 inline mr-1" />
            Registered devices can participate in monitored exams. Each student can register 
            up to {maxDevices} devices.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeviceRegistration;
