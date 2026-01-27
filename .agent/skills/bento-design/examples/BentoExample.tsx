import React from 'react';
import { AdminBentoCard } from '../../../../src/components/ui/admin-bento-card';
import { Package, Plus, MoreVertical, ExternalLink } from 'lucide-react';
import { cn } from '../../../../src/components/ui/utils';

export const BentoExample = () => {
    const items = [
        { id: 1, name: 'Premium Theme Pack', status: 'ACTIVE', type: 'DIGITAL' },
        { id: 2, name: 'Limited Edition Print', status: 'PENDING', type: 'PHYSICAL' },
    ];

    return (
        <div className="p-8 space-y-8 bg-black min-h-screen">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
                {/* Example 1: List with Actions */}
                <AdminBentoCard
                    title="INVENTORY"
                    icon={<Package className="w-4 h-4" />}
                    action={
                        <button className="flex items-center gap-2 px-3 py-1.5 bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-white/90 transition shadow-sm">
                            <Plus className="w-3 h-3" />
                            ADD ITEM
                        </button>
                    }
                >
                    <div className="divide-y divide-white/5">
                        {items.map((item) => (
                            <div
                                key={item.id}
                                className="group/item py-4 flex items-center justify-between gap-4 transition-colors"
                            >
                                <div className="flex-1 min-w-0 text-left">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h4 className="text-white font-medium text-sm md:text-base leading-tight truncate">
                                            {item.name}
                                        </h4>
                                        <span className={cn(
                                            "flex-shrink-0 px-1.5 py-0.5 text-[8px] uppercase tracking-widest font-bold border",
                                            item.status === 'ACTIVE'
                                                ? "text-green-400 border-green-400/30 bg-green-400/5"
                                                : "text-amber-400 border-amber-400/30 bg-amber-400/5"
                                        )}>
                                            {item.status}
                                        </span>
                                    </div>
                                    <p className="text-white/40 text-[10px] uppercase tracking-widest">
                                        {item.type}
                                    </p>
                                </div>

                                <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                    <button className="p-2 text-white/30 hover:text-white hover:bg-white/5 transition-all">
                                        <ExternalLink className="w-4 h-4" />
                                    </button>
                                    <button className="p-2 text-white/30 hover:text-white hover:bg-white/5 transition-all">
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </AdminBentoCard>

                {/* Example 2: Form */}
                <AdminBentoCard title="CONFIGURATION">
                    <form className="space-y-4">
                        <div>
                            <label className="block text-white/40 text-[10px] uppercase tracking-[0.2em] mb-2 font-medium">System Name</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-black border border-white/20 text-white focus:border-white transition-colors outline-none text-sm"
                                placeholder="ENTER NAME..."
                            />
                        </div>
                        <div>
                            <label className="block text-white/40 text-[10px] uppercase tracking-[0.2em] mb-2 font-medium">Description</label>
                            <textarea
                                className="w-full px-4 py-2 bg-black border border-white/20 text-white focus:border-white transition-colors outline-none text-sm h-24 resize-none"
                                placeholder="ENTER DESCRIPTION..."
                            />
                        </div>
                        <button className="w-full py-3 bg-white text-black font-bold uppercase tracking-widest text-xs hover:bg-white/90 transition mt-4">
                            SAVE CHANGES
                        </button>
                    </form>
                </AdminBentoCard>
            </div>
        </div>
    );
};
