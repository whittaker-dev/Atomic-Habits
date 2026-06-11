'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/toast/toast-provider';
import { BadgeTag, Eyebrow, StatusBadge } from '@/design-system/components/badges';
import { Button } from '@/design-system/components/button';
import { CardBase, HeroBandDark } from '@/design-system/components/cards';
import { cn } from '@/lib/utils';
import { AccommodationEditModal } from './accommodation-edit-modal';
import { AccommodationGallery } from './accommodation-gallery';
import { ItineraryDayEditModal } from './itinerary-day-edit-modal';
import { MemberCard } from './member-card';
import { MemberFormModal } from './member-form-modal';
import { TransportItemEditModal } from './transport-item-edit-modal';
import { TripInfoEditModal } from './trip-info-edit-modal';
import { DEFAULT_ACCOMMODATION_IMAGES } from './trip-defaults';
import { TripHeader } from './trip-header';
import type {
  ItineraryDayData,
  TransportIcon,
  TransportItemData,
  TripMember,
  TripPlanData,
} from './trip-plan-types';
import { usePlanTrip } from './use-plan-trip';

const SECTIONS = ['members', 'transport', 'villa', 'itinerary'] as const;
type SectionId = (typeof SECTIONS)[number];

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.6A2 2 0 0 0 13.7 5H10.3a2 2 0 0 0-1.6.9L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

function FerryIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.5 0 2.5 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.4 1.3 4.5 3.5 6" />
      <path d="M12 2v8" />
      <path d="m8 6 4-4 4 4" />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function MapIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
      <path d="M15 5.764v15" />
      <path d="M9 3.236v15" />
    </svg>
  );
}

function UtensilsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v8a5 5 0 0 0 5 5v0a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2Z" />
    </svg>
  );
}

function IconBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-md bg-surface-2 text-primary">
      {children}
    </div>
  );
}

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-lg flex flex-col gap-md sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="font-sans text-headline font-bold">{title}</h2>
        <p className="mt-sm max-w-2xl font-sans text-body-sm text-ink-subtle">{description}</p>
      </div>
      {action}
    </div>
  );
}

function SectionSwitch({
  active,
  onChange,
  labels,
}: {
  active: SectionId;
  onChange: (section: SectionId) => void;
  labels: Record<SectionId, string>;
}) {
  const { t } = useTranslation();

  return (
    <div className="container-content py-md">
      <div
        className="panel-lift mx-auto flex max-w-2xl gap-0.5 overflow-x-auto rounded-pill bg-surface-1 p-1"
        role="tablist"
        aria-label={t('planTrip.nav.label')}
      >
        {SECTIONS.map((section) => (
          <button
            key={section}
            type="button"
            role="tab"
            aria-selected={active === section}
            onClick={() => onChange(section)}
            className={cn(
              'min-h-9 flex-1 shrink-0 rounded-pill px-md font-sans text-body-sm transition-colors',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-focus/50',
              active === section
                ? 'bg-surface-3 font-medium text-ink shadow-sm'
                : 'text-ink-subtle hover:text-ink',
            )}
          >
            {labels[section]}
          </button>
        ))}
      </div>
    </div>
  );
}

function TransportIconView({ icon }: { icon: TransportIcon }) {
  if (icon === 'ferry') return <FerryIcon />;
  return <CarIcon />;
}

export function PlanTripContent() {
  const { t } = useTranslation();
  const toast = useToast();

  const [activeSection, setActiveSection] = useState<SectionId>('members');
  const [tripInfoModalOpen, setTripInfoModalOpen] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memberModalMode, setMemberModalMode] = useState<'add' | 'edit'>('add');
  const [editingMember, setEditingMember] = useState<TripMember | null>(null);
  const [transportModalOpen, setTransportModalOpen] = useState(false);
  const [transportModalMode, setTransportModalMode] = useState<'add' | 'edit'>('add');
  const [editingTransport, setEditingTransport] = useState<TransportItemData | null>(null);
  const [accommodationModalOpen, setAccommodationModalOpen] = useState(false);
  const [itineraryDayModalOpen, setItineraryDayModalOpen] = useState(false);
  const [itineraryDayModalMode, setItineraryDayModalMode] = useState<'add' | 'edit'>('add');
  const [editingDay, setEditingDay] = useState<ItineraryDayData | null>(null);

  const planDefaults = useMemo((): TripPlanData & {
    name: string;
    description: string;
    eyebrow: string;
    datesLabel: string;
  } => {
    const days = t('planTrip.itinerary.days', { returnObjects: true }) as Array<{
      label: string;
      entries: Array<{
        time: string;
        title: string;
        location: string;
        meal?: string;
        type: 'activity' | 'meal' | 'travel';
      }>;
    }>;

    return {
      name: t('planTrip.hero.title'),
      description: t('planTrip.hero.subtitle'),
      eyebrow: t('planTrip.hero.eyebrow'),
      datesLabel: t('planTrip.hero.dates'),
      transport: [
        {
          id: 'default-car',
          icon: 'car' as const,
          title: t('planTrip.transport.car.title'),
          description: t('planTrip.transport.car.description'),
          details: t('planTrip.transport.car.details', { returnObjects: true }) as string[],
        },
        {
          id: 'default-ferry',
          icon: 'ferry' as const,
          title: t('planTrip.transport.ferry.title'),
          description: t('planTrip.transport.ferry.description'),
          details: t('planTrip.transport.ferry.details', { returnObjects: true }) as string[],
        },
      ],
      accommodation: {
        eyebrow: t('planTrip.villa.eyebrow'),
        name: t('planTrip.villa.name'),
        address: t('planTrip.villa.address'),
        checkInTime: t('planTrip.villa.checkInTime'),
        checkOutTime: t('planTrip.villa.checkOutTime'),
        contactInfo: t('planTrip.villa.contactInfo'),
        amenities: t('planTrip.villa.amenities', { returnObjects: true }) as string[],
        images: DEFAULT_ACCOMMODATION_IMAGES,
        notes: t('planTrip.villa.notes'),
      },
      itinerary: {
        days: days.map((day, dayIndex) => ({
          id: `day-${dayIndex}`,
          label: day.label,
          entries: day.entries.map((entry, entryIndex) => ({
            id: `day-${dayIndex}-entry-${entryIndex}`,
            ...entry,
          })),
        })),
      },
    };
  }, [t]);

  const {
    meta,
    members,
    transport,
    accommodation,
    itinerary,
    hydrated,
    saving,
    saveError,
    updateMeta,
    addMember,
    updateMember,
    deleteMember,
    addTransportItem,
    updateTransportItem,
    deleteTransportItem,
    updateAccommodation,
    addItineraryDay,
    updateItineraryDay,
    deleteItineraryDay,
  } = usePlanTrip({ defaults: planDefaults });

  const sectionLabels = useMemo(
    () =>
      Object.fromEntries(
        SECTIONS.map((section) => [section, t(`planTrip.nav.${section}`)]),
      ) as Record<SectionId, string>,
    [t],
  );

  const openAddModal = () => {
    setMemberModalMode('add');
    setEditingMember(null);
    setMemberModalOpen(true);
  };

  const openEditModal = (member: TripMember) => {
    setMemberModalMode('edit');
    setEditingMember(member);
    setMemberModalOpen(true);
  };

  const handleMemberSubmit = (data: Omit<TripMember, 'id'>) => {
    if (memberModalMode === 'add') {
      addMember(data);
      toast.success(t('planTrip.members.toastAdded', { name: data.name }));
      return;
    }
    if (editingMember) {
      updateMember(editingMember.id, data);
      toast.success(t('planTrip.members.toastUpdated', { name: data.name }));
    }
  };

  const openAddTransport = () => {
    setTransportModalMode('add');
    setEditingTransport(null);
    setTransportModalOpen(true);
  };

  const openEditTransport = (item: TransportItemData) => {
    setTransportModalMode('edit');
    setEditingTransport(item);
    setTransportModalOpen(true);
  };

  const handleTransportSubmit = (data: Omit<TransportItemData, 'id'>) => {
    if (transportModalMode === 'add') {
      addTransportItem(data);
      toast.success(t('planTrip.transport.toastAdded'));
      return;
    }
    if (editingTransport) {
      updateTransportItem(editingTransport.id, data);
      toast.success(t('planTrip.transport.toastSaved'));
    }
  };

  const handleDeleteTransport = (item: TransportItemData) => {
    const confirmed = window.confirm(t('planTrip.transport.confirmDelete', { name: item.title }));
    if (!confirmed) return;
    deleteTransportItem(item.id);
    toast.info(t('planTrip.transport.toastRemoved', { name: item.title }));
  };

  const handleAccommodationSubmit = (data: typeof accommodation) => {
    updateAccommodation(data);
    toast.success(t('planTrip.villa.toastSaved'));
  };

  const openAddDay = () => {
    setItineraryDayModalMode('add');
    setEditingDay(null);
    setItineraryDayModalOpen(true);
  };

  const openEditDay = (day: ItineraryDayData) => {
    setItineraryDayModalMode('edit');
    setEditingDay(day);
    setItineraryDayModalOpen(true);
  };

  const handleItineraryDaySubmit = (data: Omit<ItineraryDayData, 'id'>) => {
    if (itineraryDayModalMode === 'add') {
      addItineraryDay(data);
      toast.success(t('planTrip.itinerary.toastDayAdded'));
      return;
    }
    if (editingDay) {
      updateItineraryDay(editingDay.id, data);
      toast.success(t('planTrip.itinerary.toastDaySaved'));
    }
  };

  const handleDeleteDay = (day: ItineraryDayData) => {
    const confirmed = window.confirm(t('planTrip.itinerary.confirmDeleteDay', { name: day.label }));
    if (!confirmed) return;
    deleteItineraryDay(day.id);
    toast.info(t('planTrip.itinerary.toastDayRemoved', { name: day.label }));
  };

  const handleDeleteMember = (member: TripMember) => {
    const confirmed = window.confirm(t('planTrip.members.confirmDelete', { name: member.name }));
    if (!confirmed) return;
    deleteMember(member.id);
    toast.info(t('planTrip.members.toastRemoved', { name: member.name }));
  };

  const entryTypeStyles = {
    activity: 'border-primary/30 bg-primary/5',
    meal: 'border-warning/30 bg-warning/5',
    travel: 'border-info/30 bg-info/5',
  };

  return (
    <>
      <TripHeader
        title={meta.name}
        datesLabel={meta.datesLabel}
        saving={saving}
        onEditTrip={() => setTripInfoModalOpen(true)}
      />
      <main className="min-h-screen bg-canvas">
        {saveError && (
          <div className="container-content pt-md">
            <p className="rounded-md border border-error/30 bg-error/5 px-md py-sm font-sans text-body-sm text-error">
              {t('planTrip.trip.saveError', { message: saveError })}
            </p>
          </div>
        )}

        <HeroBandDark
          className="trip-hero"
          eyebrow={meta.eyebrow}
          title={meta.name}
          subtitle={meta.description}
          actions={
            <div className="flex flex-wrap items-center gap-sm">
              <StatusBadge className="px-md py-xs text-body-sm">
                {meta.datesLabel || t('planTrip.trip.noDates')}
              </StatusBadge>
              <Button variant="secondary" onClick={() => setTripInfoModalOpen(true)}>
                {t('planTrip.trip.editButton')}
              </Button>
            </div>
          }
        />

        <SectionSwitch active={activeSection} onChange={setActiveSection} labels={sectionLabels} />

        <div className="container-content pb-section" role="tabpanel">
          {activeSection === 'members' && (
            <section>
              <SectionHeading
                title={t('planTrip.members.title')}
                description={t('planTrip.members.description')}
              />
              <div className="mb-lg flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-sm">
                  <IconBadge>
                    <UsersIcon />
                  </IconBadge>
                  <p className="font-sans text-body-sm text-ink-subtle">
                    {hydrated
                      ? t('planTrip.members.count', { count: members.length })
                      : t('planTrip.members.loading')}
                  </p>
                </div>
                <Button onClick={openAddModal}>{t('planTrip.members.add')}</Button>
              </div>

              {!hydrated ? (
                <CardBase className="text-center">
                  <p className="font-sans text-body-sm text-ink-subtle">
                    {t('planTrip.members.loading')}
                  </p>
                </CardBase>
              ) : members.length === 0 ? (
                <CardBase className="flex flex-col items-center py-xxl text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-2 text-ink-muted">
                    <UsersIcon className="h-8 w-8" />
                  </div>
                  <h3 className="mt-lg font-sans text-card-title">
                    {t('planTrip.members.emptyTitle')}
                  </h3>
                  <p className="mt-sm max-w-sm font-sans text-body-sm text-ink-subtle">
                    {t('planTrip.members.emptyDescription')}
                  </p>
                  <Button className="mt-lg" onClick={openAddModal}>
                    {t('planTrip.members.addFirst')}
                  </Button>
                </CardBase>
              ) : (
                <div className="grid gap-xl sm:grid-cols-2 lg:grid-cols-3">
                  {members.map((member, index) => (
                    <MemberCard
                      key={member.id}
                      member={member}
                      index={index}
                      crewLabel={t('planTrip.members.crewBadge')}
                      editLabel={t('planTrip.members.edit')}
                      deleteLabel={t('planTrip.members.delete')}
                      onEdit={() => openEditModal(member)}
                      onDelete={() => handleDeleteMember(member)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {activeSection === 'transport' && (
            <section>
              <SectionHeading
                title={t('planTrip.transport.title')}
                description={t('planTrip.transport.description')}
                action={<Button onClick={openAddTransport}>{t('planTrip.transport.add')}</Button>}
              />
              {transport.length === 0 ? (
                <CardBase className="text-center">
                  <p className="font-sans text-body-sm text-ink-subtle">
                    {t('planTrip.transport.empty')}
                  </p>
                  <Button className="mt-md" onClick={openAddTransport}>
                    {t('planTrip.transport.addFirst')}
                  </Button>
                </CardBase>
              ) : (
                <div className="grid gap-lg md:grid-cols-2">
                  {transport.map((method) => (
                    <CardBase key={method.id} className="flex flex-col">
                      <div className="flex items-start justify-between gap-sm">
                        <IconBadge>
                          <TransportIconView icon={method.icon} />
                        </IconBadge>
                        <div className="flex gap-xs">
                          <Button variant="secondary" onClick={() => openEditTransport(method)}>
                            {t('planTrip.edit.button')}
                          </Button>
                          <Button
                            variant="ghost"
                            className="text-error hover:text-error"
                            onClick={() => handleDeleteTransport(method)}
                          >
                            {t('planTrip.transport.delete')}
                          </Button>
                        </div>
                      </div>
                      <h3 className="mt-md font-sans text-card-title">{method.title}</h3>
                      <p className="mt-sm font-sans text-body-sm text-ink-subtle">
                        {method.description}
                      </p>
                      <ul className="mt-md space-y-xs border-t border-hairline pt-md font-sans text-body-sm text-ink-subtle">
                        {method.details.map((detail) => (
                          <li key={detail} className="flex items-start gap-sm">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </CardBase>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeSection === 'villa' && (
            <section>
              <SectionHeading
                title={t('planTrip.villa.title')}
                description={t('planTrip.villa.description')}
                action={
                  <Button variant="secondary" onClick={() => setAccommodationModalOpen(true)}>
                    {t('planTrip.edit.button')}
                  </Button>
                }
              />
              <div className="mb-lg">
                <h3 className="mb-md font-sans text-card-title">
                  {t('planTrip.villa.galleryTitle')}
                </h3>
                <AccommodationGallery images={accommodation.images} name={accommodation.name} />
              </div>

              <CardBase className="overflow-hidden p-0">
                <div className="bg-gradient-to-br from-primary/10 via-surface-1 to-surface-2 p-xl">
                  <div className="flex items-start gap-md">
                    <IconBadge>
                      <HomeIcon />
                    </IconBadge>
                    <div>
                      <Eyebrow>{accommodation.eyebrow}</Eyebrow>
                      <h3 className="mt-xs font-sans text-headline">{accommodation.name}</h3>
                      <p className="mt-sm flex items-start gap-sm font-sans text-body-sm text-ink-subtle">
                        <MapIcon className="mt-0.5 shrink-0 text-ink-muted" />
                        {accommodation.address}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-lg p-xl md:grid-cols-2">
                  <div>
                    <p className="font-sans text-caption font-medium uppercase tracking-wide text-ink-tertiary">
                      {t('planTrip.villa.checkIn')}
                    </p>
                    <p className="mt-xs font-sans text-body font-medium">
                      {accommodation.checkInTime}
                    </p>
                  </div>
                  <div>
                    <p className="font-sans text-caption font-medium uppercase tracking-wide text-ink-tertiary">
                      {t('planTrip.villa.checkOut')}
                    </p>
                    <p className="mt-xs font-sans text-body font-medium">
                      {accommodation.checkOutTime}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="font-sans text-caption font-medium uppercase tracking-wide text-ink-tertiary">
                      {t('planTrip.villa.contact')}
                    </p>
                    <p className="mt-xs font-sans text-body">{accommodation.contactInfo}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="mb-sm font-sans text-caption font-medium uppercase tracking-wide text-ink-tertiary">
                      {t('planTrip.villa.amenitiesLabel')}
                    </p>
                    <div className="flex flex-wrap gap-sm">
                      {accommodation.amenities.map((amenity) => (
                        <BadgeTag key={amenity}>{amenity}</BadgeTag>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2 rounded-md border border-hairline bg-surface-2/50 p-md">
                    <p className="font-sans text-body-sm text-ink-subtle">{accommodation.notes}</p>
                  </div>
                </div>
              </CardBase>
            </section>
          )}

          {activeSection === 'itinerary' && (
            <section>
              <SectionHeading
                title={t('planTrip.itinerary.title')}
                description={t('planTrip.itinerary.description')}
                action={<Button onClick={openAddDay}>{t('planTrip.itinerary.addDay')}</Button>}
              />
              <div className="space-y-xl">
                {itinerary.days.map((day) => (
                  <div key={day.id}>
                    <div className="mb-lg flex flex-wrap items-center justify-between gap-md">
                      <div className="flex min-w-0 flex-1 items-center gap-md">
                        <div className="h-px flex-1 bg-hairline" />
                        <h3 className="shrink-0 font-sans text-card-title text-primary">
                          {day.label}
                        </h3>
                        <div className="h-px flex-1 bg-hairline" />
                      </div>
                      <div className="flex gap-sm">
                        <Button variant="secondary" onClick={() => openEditDay(day)}>
                          {t('planTrip.edit.button')}
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-error hover:text-error"
                          onClick={() => handleDeleteDay(day)}
                        >
                          {t('planTrip.itinerary.deleteDay')}
                        </Button>
                      </div>
                    </div>

                    <ol className="relative space-y-md">
                      {day.entries.map((entry, index) => (
                        <li key={entry.id} className="relative pl-10">
                          {index < day.entries.length - 1 && (
                            <span
                              className="absolute left-[15px] top-8 h-[calc(100%+0.5rem)] w-px bg-hairline"
                              aria-hidden
                            />
                          )}
                          <span
                            className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-surface-2 font-mono text-caption text-ink-muted"
                            aria-hidden
                          >
                            {entry.time.split(':')[0]}
                          </span>

                          <div
                            className={cn(
                              'rounded-lg border p-md transition-colors',
                              entryTypeStyles[entry.type],
                            )}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-sm">
                              <div>
                                <p className="font-mono text-caption text-ink-muted">
                                  {entry.time}
                                </p>
                                <h4 className="mt-xs font-sans text-body font-medium">
                                  {entry.title}
                                </h4>
                                <p className="mt-xs font-sans text-body-sm text-ink-subtle">
                                  <MapIcon className="mr-1 inline h-4 w-4 -translate-y-px text-ink-muted" />
                                  {entry.location}
                                </p>
                              </div>
                              <BadgeTag variant={entry.type === 'meal' ? 'success' : 'default'}>
                                {t(`planTrip.itinerary.types.${entry.type}`)}
                              </BadgeTag>
                            </div>
                            {entry.meal && (
                              <p className="mt-sm flex items-center gap-sm rounded-sm bg-surface-1/60 px-sm py-xs font-sans text-body-sm text-ink-subtle">
                                <UtensilsIcon className="shrink-0 text-primary" />
                                {entry.meal}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <MemberFormModal
        open={memberModalOpen}
        mode={memberModalMode}
        initial={
          editingMember
            ? {
                name: editingMember.name,
                role: editingMember.role,
                phone: editingMember.phone,
                note: editingMember.note,
              }
            : undefined
        }
        onClose={() => setMemberModalOpen(false)}
        onSubmit={handleMemberSubmit}
      />

      <TransportItemEditModal
        open={transportModalOpen}
        mode={transportModalMode}
        initial={
          editingTransport
            ? {
                icon: editingTransport.icon,
                title: editingTransport.title,
                description: editingTransport.description,
                details: editingTransport.details,
              }
            : undefined
        }
        onClose={() => setTransportModalOpen(false)}
        onSubmit={handleTransportSubmit}
      />

      <AccommodationEditModal
        open={accommodationModalOpen}
        initial={accommodation}
        onClose={() => setAccommodationModalOpen(false)}
        onSubmit={handleAccommodationSubmit}
      />

      <ItineraryDayEditModal
        open={itineraryDayModalOpen}
        mode={itineraryDayModalMode}
        initial={editingDay ? { label: editingDay.label, entries: editingDay.entries } : undefined}
        onClose={() => setItineraryDayModalOpen(false)}
        onSubmit={handleItineraryDaySubmit}
      />

      <TripInfoEditModal
        open={tripInfoModalOpen}
        initial={meta}
        onClose={() => setTripInfoModalOpen(false)}
        onSubmit={(data) => {
          updateMeta(data);
          toast.success(t('planTrip.trip.toastSaved'));
        }}
      />
    </>
  );
}
