//src/components/dashboard/DeliveryTab.jsx/
import { useState, useEffect } from 'react';
import { Truck, Save, Check, AlertCircle, Package, Globe, Smartphone, Lock } from 'lucide-react';
import { NIGERIAN_STATES } from '../../utils/nigeriaLocations';
import { updateStore } from '../../firebase/auth';

export default function DeliveryTab({ store, onSave, saveLoading, saveError, saveSuccess, isPro, onDeliveryZonesUpdate, orders }) {
  const [formData, setFormData] = useState({
    streetAddress: '',
    city: '',
    state: ''
  });

  const [zones, setZones] = useState(store?.deliveryZones ?? []);
  const [zoneForm, setZoneForm] = useState({ name: '', state: '', lga: '', price: '' });
  const [zonesSaving, setZonesSaving] = useState(false);
  const [zonesError, setZonesError] = useState('');

  useEffect(() => {
    if (store?.pickupAddress) {
      setFormData({
        streetAddress: store.pickupAddress.streetAddress || '',
        city: store.pickupAddress.city || '',
        state: store.pickupAddress.state || ''
      });
    }
  }, [store]);

  useEffect(() => {
    setZones(store?.deliveryZones ?? []);
  }, [store]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleZoneChange = (e) => {
    const { name, value } = e.target;
    setZoneForm(prev => ({ ...prev, [name]: value }));
  };

  const addZone = async () => {
    setZonesError('');
    if (!zoneForm.name.trim() || !zoneForm.state || !zoneForm.price) { setZonesError('Please provide name, state and price for the zone.'); return }
    const newZone = {
      id: crypto.randomUUID(),
      name: zoneForm.name.trim(),
      state: zoneForm.state,
      lga: zoneForm.lga?.trim() || '',
      price: Number(zoneForm.price),
    };
    const updated = [newZone, ...(zones || [])];
    setZonesSaving(true);
    try {
      await updateStore(store.id, { deliveryZones: updated });
      setZones(updated);
      setZoneForm({ name: '', state: '', lga: '', price: '' });
      if (onDeliveryZonesUpdate) onDeliveryZonesUpdate(updated);
    } catch (err) {
      console.error('Failed to save delivery zones', err);
      setZonesError('Failed to save delivery zone. Please try again.');
    } finally {
      setZonesSaving(false);
    }
  };

  const deleteZone = async (id) => {
    if (!window.confirm('Delete this delivery zone?')) return;
    const updated = (zones || []).filter(z => z.id !== id);
    setZonesSaving(true);
    try {
      await updateStore(store.id, { deliveryZones: updated });
      setZones(updated);
      if (onDeliveryZonesUpdate) onDeliveryZonesUpdate(updated);
    } catch (err) {
      console.error('Failed to delete delivery zone', err);
      setZonesError('Failed to delete delivery zone. Please try again.');
    } finally {
      setZonesSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Delivery</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your delivery settings and prepare for Shipbubble integration.</p>
        </div>
      </div>

      {/* Pickup Address Form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
            <Truck size={20} className="text-green-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-sm">Pickup Address</h2>
            <p className="text-gray-400 text-xs mt-0.5">This is where your orders will be shipped from.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Street Address</label>
            <input
              type="text"
              name="streetAddress"
              value={formData.streetAddress}
              onChange={handleChange}
              placeholder="e.g., 123 Main Street, Suite 400"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g., Lagos"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">State</label>
              <select
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                required
              >
                <option value="">Select a state</option>
                {NIGERIAN_STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
          </div>

          {saveError && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2.5 rounded-xl text-xs font-medium border border-red-100">
              <AlertCircle size={14} />
              {saveError}
            </div>
          )}

          {saveSuccess && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2.5 rounded-xl text-xs font-medium border border-green-100">
              <Check size={14} />
              Address saved successfully!
            </div>
          )}

          <button
            type="submit"
            disabled={saveLoading}
            className="w-full sm:w-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-bold transition-all shadow-sm disabled:opacity-50"
          >
            {saveLoading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
            ) : (
              <><Save size={14} /> Save Address</>
            )}
          </button>
        </form>
      </div>

      {/* Delivery Zones */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Globe size={20} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-sm">Delivery Zones</h2>
            <p className="text-gray-400 text-xs mt-0.5">Add specific delivery zones and prices. Available for Pro and Premium vendors.</p>
          </div>
        </div>

        {!isPro && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-2xl">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Lock size={20} className="text-gray-600" />
              </div>
              <div className="text-sm text-gray-700 font-semibold">Delivery Zones are a Pro feature</div>
              <div className="text-xs text-gray-500 mt-1">Upgrade to Pro to manage delivery zones.</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Zone name</label>
            <input name="name" value={zoneForm.name} onChange={handleZoneChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm" placeholder="e.g., Lagos Island" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">State</label>
            <select name="state" value={zoneForm.state} onChange={handleZoneChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm">
              <option value="">Select a state</option>
              {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">LGA (optional)</label>
            <input name="lga" value={zoneForm.lga} onChange={handleZoneChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm" placeholder="e.g., Eti-Osa" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Price (NGN)</label>
            <input name="price" value={zoneForm.price} onChange={handleZoneChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm" placeholder="e.g., 500" />
          </div>
          <div className="sm:col-span-2 flex items-center gap-2">
            <button disabled={!isPro || zonesSaving} onClick={addZone} className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold">Add Zone</button>
            {zonesSaving && <div className="text-sm text-gray-500">Saving...</div>}
            {zonesError && <div className="text-sm text-red-600">{zonesError}</div>}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(zones || []).map(z => (
            <div key={z.id} className="border border-gray-100 rounded-xl p-3 flex justify-between items-start">
              <div>
                <div className="font-semibold text-gray-900">{z.name}</div>
                <div className="text-xs text-gray-500">{z.state}{z.lga ? ` • ${z.lga}` : ''}</div>
                <div className="text-sm text-gray-700 mt-1">₦{z.price}</div>
              </div>
              <div>
                <button onClick={() => deleteZone(z.id)} disabled={!isPro || zonesSaving} className="text-xs text-red-600">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Shipments */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center">
            <Smartphone size={20} className="text-yellow-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-sm">Active Shipments</h2>
            <p className="text-gray-400 text-xs mt-0.5">View orders with Shipbubble tracking IDs.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {(orders || []).filter(o => o.shipbubbleTrackingId).map(o => (
            <div key={o.id || o.orderId || o.shipbubbleTrackingId} className="border border-gray-100 rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">{o.customerName || o.customer?.name || 'Customer'}</div>
                <div className="text-xs text-gray-500">Tracking ID: {o.shipbubbleTrackingId}</div>
                <div className="text-xs text-gray-500">Status: {o.shipbubbleStatus || 'Unknown'}</div>
              </div>
              <div>
                <a href={`https://tracking.shipbubble.com/${o.shipbubbleTrackingId}`} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 font-semibold">Track Shipment</a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coming Soon Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Package size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-sm mb-1">Coming to Delivery</h2>
            <p className="text-gray-400 text-xs leading-relaxed mb-3">
              Soon you'll be able to:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-xs text-gray-700">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Automated shipping rate calculation
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-700">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Shipbubble courier integration
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-700">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Self-delivery option
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-700">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Shipment tracking for customers
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
