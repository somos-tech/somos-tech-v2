import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Loader2, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import eventService from "@/api/eventService";
import type { CreateEventDto } from "@shared/types";

interface CreateEventDialogProps {
    open: boolean;
    setOpen: (v: boolean) => void;
    onEventCreated?: () => void;
}

export default function CreateEventDialog({ open, setOpen, onEventCreated }: CreateEventDialogProps) {
    const [step, setStep] = useState(1);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState<Partial<CreateEventDto>>({
        name: '',
        date: '',
        location: '',
        status: 'draft',
        description: ''
    });

    const handleInputChange = (field: keyof CreateEventDto, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const next = async () => {
        setError(null);

        if (step === 1) {
            // Validate basic fields
            if (!formData.name || !formData.date || !formData.location) {
                setError('Please fill in all required fields');
                return;
            }
            setStep(2);
            return;
        }

        if (step === 2) {
            // Create the event via API
            setBusy(true);
            try {
                await eventService.createEvent(formData as CreateEventDto);
                setStep(3);
                // Notify parent to refresh the list
                onEventCreated?.();
            } catch (err) {
                console.error('Failed to create event:', err);
                setError('Failed to create event. Please try again.');
            } finally {
                setBusy(false);
            }
            return;
        }

        if (step === 3) {
            // Close dialog and reset
            setOpen(false);
            setTimeout(() => {
                setStep(1);
                setFormData({
                    name: '',
                    date: '',
                    location: '',
                    status: 'draft',
                    description: ''
                });
            }, 300);
        }
    };

    const prev = () => setStep(Math.max(1, step - 1));

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-2xl rounded-2xl" style={{ backgroundColor: '#051323', border: '1px solid rgba(0, 255, 145, 0.2)', color: '#FFFFFF' }}>
                <DialogHeader>
                    <DialogTitle style={{ color: '#FFFFFF' }}>Create new event</DialogTitle>
                    <DialogDescription style={{ color: '#8394A7' }}>Step {step} of 3</DialogDescription>
                </DialogHeader>

                {step === 1 && (
                    <div className="grid gap-4">
                        {error && (
                            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
                                {error}
                            </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label>Event name *</Label>
                                <Input
                                    placeholder="e.g., Community Coding Night"
                                    className="rounded-xl"
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Status</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(v) => handleInputChange('status', v)}
                                >
                                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Draft" /></SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="published">Published</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Date & time *</Label>
                                <Input
                                    type="datetime-local"
                                    className="rounded-xl"
                                    value={formData.date}
                                    onChange={(e) => handleInputChange('date', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Location *</Label>
                                <Input
                                    placeholder="e.g., Downtown Library"
                                    className="rounded-xl"
                                    value={formData.location}
                                    onChange={(e) => handleInputChange('location', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Capacity</Label>
                                <Input
                                    type="number"
                                    placeholder="100"
                                    className="rounded-xl"
                                    value={formData.capacity || ''}
                                    onChange={(e) => handleInputChange('capacity', parseInt(e.target.value) || undefined)}
                                />
                            </div>
                            <div>
                                <Label>Expected Attendees</Label>
                                <Input
                                    type="number"
                                    placeholder="50"
                                    className="rounded-xl"
                                    value={formData.attendees || ''}
                                    onChange={(e) => handleInputChange('attendees', parseInt(e.target.value) || undefined)}
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <Label>Description</Label>
                                <Textarea
                                    placeholder="Quick summary of the event goals, audience, and agenda."
                                    className="rounded-xl resize-none overflow-y-auto max-h-40"
                                    value={formData.description}
                                    onChange={(e) => handleInputChange('description', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="grid gap-6">
                        <div>
                            <div className="flex items-center gap-2 text-sm text-slate-600"><Sparkles className="h-4 w-4" /> AI workflow</div>
                            <p className="text-sm text-slate-500 mt-1">Choose which assistants to run after saving.</p>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <Card className="rounded-2xl border-slate-200">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="font-medium">Social copy</div>
                                        <Checkbox defaultChecked />
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1">Generate posts for X/Instagram/LinkedIn.</p>
                                    <div className="mt-3">
                                        <Label className="text-xs">Tone</Label>
                                        <Select defaultValue="friendly">
                                            <SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="friendly">Friendly</SelectItem>
                                                <SelectItem value="formal">Formal</SelectItem>
                                                <SelectItem value="excited">Excited</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl border-slate-200">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="font-medium">Venue outreach</div>
                                        <Checkbox defaultChecked />
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1">Email/call shortlisted venues for availability.</p>
                                    <div className="mt-3">
                                        <Label className="text-xs">City</Label>
                                        <Input className="rounded-xl h-9" placeholder="e.g., Medellín" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl border-slate-200">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="font-medium">Sponsor leads</div>
                                        <Checkbox />
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1">Find and draft outreach to potential sponsors.</p>
                                    <div className="mt-3">
                                        <Label className="text-xs">Category</Label>
                                        <Select defaultValue="tech">
                                            <SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="tech">Tech</SelectItem>
                                                <SelectItem value="food">Food & Bev</SelectItem>
                                                <SelectItem value="finance">Finance</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl border-slate-200">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="font-medium">Asset kit</div>
                                        <Checkbox />
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1">Generate a banner, flyer layout, and email invite.</p>
                                </CardContent>
                            </Card>
                        </div>

                        {busy && (
                            <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <div className="text-sm text-slate-600">Starting assistants…</div>
                            </div>
                        )}
                    </div>
                )}

                {step === 3 && (
                    <div className="grid gap-3">
                        <div className="text-sm text-slate-600">Assistants progress</div>
                        <div className="space-y-3">
                            {[{ label: "Social copy", pct: 72 }, { label: "Venue outreach", pct: 41 }, { label: "Sponsor leads", pct: 0 }].map((t, i) => (
                                <div key={i}>
                                    <div className="flex items-center justify-between text-sm mb-1">
                                        <span>{t.label}</span>
                                        <span className="text-slate-500">{t.pct}%</span>
                                    </div>
                                    <Progress value={t.pct} className="h-2 rounded-full" />
                                </div>
                            ))}
                        </div>

                        <Card className="rounded-2xl border-slate-200">
                            <CardContent className="p-4">
                                <div className="text-sm font-medium mb-2 flex items-center gap-2"><Sparkles className="h-4 w-4" /> Task dependencies</div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        <span className="font-medium">Venue outreach</span>
                                        <span className="text-slate-500">→ provides venue name/city</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-amber-600" />
                                        <span className="font-medium">Social copy</span>
                                        <Badge className="rounded-lg bg-amber-100 text-amber-800 ml-1">Waiting on Venue</Badge>
                                        <span className="text-slate-500">auto-starts when Venue outreach completes</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-slate-500" />
                                        <span className="font-medium">Sponsor leads</span>
                                        <Badge className="rounded-lg bg-slate-100 text-slate-700 ml-1">Queued</Badge>
                                        <span className="text-slate-500">optional; enriches posts with mentions/logos</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                            <div className="text-xs text-slate-600">Success!</div>
                            <div className="text-sm">Event "{formData.name}" has been created successfully.</div>
                        </div>
                    </div>
                )}

                <DialogFooter className="mt-4">
                    <div className="flex w-full justify-between">
                        <Button variant="ghost" onClick={prev} className="rounded-xl" disabled={step === 1}>Back</Button>
                        <div className="flex gap-2">
                            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)} style={{ borderColor: '#00FF91', color: '#00FF91' }}>Cancel</Button>
                            <Button
                                className="rounded-xl"
                                style={{ backgroundColor: '#00FF91', color: '#051323' }}
                                onClick={next}
                                disabled={busy}
                            >
                                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {step < 3 ? (step === 2 ? "Create Event" : "Continue") : "Close"}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}