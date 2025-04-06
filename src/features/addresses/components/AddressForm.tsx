'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTransition } from 'react';
import { AddressData, ConakryCommune } from '@/services/addresses.service';
import { generatePostalCode, formatAddress } from '@/lib/postal';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload } from '@/components/Upload';
import { MapPin, ArrowLeft, ArrowRight, User, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { StepIndicator } from '@/components/StepIndicator';
import { Mapbox } from '../../../components/Mapbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const addressSchema = z.object({
  recipient: z.string().min(3, "Minimum 3 caractères").max(100).transform((val) => val.trim()),
  locationType: z.enum(["URBAIN", "RURAL"], { required_error: "Type requis" }),
  commune: z.string().optional(),
  district: z.string().min(1, "Quartier requis").transform((val) => val.trim()),
  street: z.string().optional().transform((val) => val?.trim()),
  landmark: z.string().min(1, "Repère requis").transform((val) => val.trim()),
  prefecture: z.string().optional().transform((val) => val?.trim()),
  subPrefecture: z.string().optional().transform((val) => val?.trim()),
  village: z.string().optional().transform((val) => val?.trim()),
  region: z.enum(["CONAKRY", "BOKE", "KINDIA", "LABE", "MAMOU", "NZEREKORE", "FARANAH", "KANKAN"]).optional(),
  lat: z.number({ required_error: "Latitude requise" }).min(-90).max(90),
  lng: z.number({ required_error: "Longitude requise" }).min(-180).max(180),
  deliveryInstructions: z.string().optional().transform((val) => val?.trim()),
  photoUrl: z.string().optional(),
}).refine(
  (data) => {
    if (data.locationType === "URBAIN" && !data.commune) return false;
    if (data.locationType === "RURAL" && (!data.prefecture || !data.subPrefecture || !data.village || !data.region)) return false;
    if (data.locationType === "URBAIN" && data.region !== "CONAKRY") return false;
    if (data.locationType === "RURAL" && data.region === "CONAKRY") return false;
    return true;
  },
  { message: "Incohérence entre type et région", path: ["locationType"] }
);

type AddressFormValues = z.infer<typeof addressSchema>;

interface AddressFormProps {
  userId: number;
  createAddress: (data: AddressData) => void;
  onSuccess?: () => void;
}

export const AddressForm = ({ userId, createAddress, onSuccess }: AddressFormProps) => {
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 9.6412, lng: -13.5784 });
  const [error, setError] = useState<string | null>(null);

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      recipient: "",
      locationType: "URBAIN",
      commune: "Kaloum" as ConakryCommune,
      district: "",
      street: "",
      landmark: "",
      prefecture: "",
      subPrefecture: "",
      village: "",
      region: "CONAKRY",
      lat: undefined,
      lng: undefined,
      deliveryInstructions: "",
      photoUrl: "",
    },
  });

  useEffect(() => {
    const locationType = form.watch("locationType");
    if (locationType === "URBAIN") form.setValue("region", "CONAKRY");
    else if (locationType === "RURAL" && form.watch("region") === "CONAKRY") form.setValue("region", "BOKE");
  }, [form.watch("locationType"), form]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) return toast.error("Géolocalisation non supportée.");
    setIsGeolocating(true);
    startTransition(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          form.setValue("lat", position.coords.latitude);
          form.setValue("lng", position.coords.longitude);
          setMapCenter({ lat: position.coords.latitude, lng: position.coords.longitude });
          setIsGeolocating(false);
          toast.success("Position obtenue avec succès");
        },
        () => {
          toast.error("Erreur de géolocalisation.");
          setIsGeolocating(false);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  };

  const handleLocationSelect = (position: mapboxgl.LngLat) => {
    const lat = position.lat;
    const lng = position.lng;
    form.setValue("lat", lat);
    form.setValue("lng", lng);
    setMapCenter({ lat, lng });
    toast.success(`Coordonnées sélectionnées : Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`);
  };

  const onSubmit = (values: AddressFormValues) => {
    startTransition(() => {
      try {
        const region = values.locationType === "URBAIN" ? "CONAKRY" : values.region!;
        const postalCode = generatePostalCode(region, values.locationType, values);
        const location =
          values.locationType === "URBAIN"
            ? { 
                type: "URBAIN" as const, 
                commune: values.commune as ConakryCommune, 
                district: values.district, 
                street: values.street, 
                landmark: values.landmark 
              }
            : { 
                type: "RURAL" as const, 
                prefecture: values.prefecture || "", 
                subPrefecture: values.subPrefecture || "", 
                village: values.village || "", 
                district: values.district, 
                landmark: values.landmark 
              };
        
        const addressData: AddressData = {
          recipient: values.recipient,
          userId,
          location,
          coordinates: { lat: values.lat, lng: values.lng },
          region,
          postalCode,
          formattedAddress: formatAddress({ location }, postalCode),
          deliveryInstructions: values.deliveryInstructions,
          photoUrl: values.photoUrl || undefined,
        };

        createAddress(addressData);
        form.reset();
        setStep(1);
        if (onSuccess) onSuccess();
      } catch {
        setError("Une erreur est survenue lors de la création de l'adresse.");
      }
    });
  };

  const handleNext = async () => {
    if (isValidating) return;
    setIsValidating(true);
    
    const fields: (keyof AddressFormValues)[] = 
      step === 1 ? ["recipient", "locationType"] : 
      step === 2 ? (form.watch("locationType") === "URBAIN" ? ["commune", "district", "landmark"] : ["region", "prefecture", "subPrefecture", "village", "district", "landmark"]) : 
      step === 3 ? ["lat", "lng"] : 
      [];
    
    const isValid = await form.trigger(fields);
    if (isValid) {
      setStep(step + 1);
    } else {
      toast.error("Veuillez remplir tous les champs requis correctement.");
    }
    setIsValidating(false);
  };

  const renderStepIndicator = () => (
    <div className="flex justify-between mb-8">
      <StepIndicator
        label="Destinataire"
        active={step === 1}
        completed={step > 1}
        icon={<User className="h-4 w-4" />}
        onClick={() => step > 1 && setStep(1)}
        ariaLabel="Étape 1: Informations du destinataire"
      />
      <StepIndicator
        label="Adresse"
        active={step === 2}
        completed={step > 2}
        icon={<MapPin className="h-4 w-4" />}
        onClick={() => step > 2 && setStep(2)}
        ariaLabel="Étape 2: Détails de l'adresse"
      />
      <StepIndicator
        label="Localisation"
        active={step === 3}
        completed={step > 3}
        icon={<MapPin className="h-4 w-4" />}
        onClick={() => step > 3 && setStep(3)}
        ariaLabel="Étape 3: Position géographique"
      />
      <StepIndicator
        label="Résumé"
        active={step === 4}
        completed={false}
        icon={<CheckCircle className="h-4 w-4" />}
        ariaLabel="Étape 4: Résumé de l'adresse"
      />
    </div>
  );

  const renderAddressSummary = () => {
    const values = form.getValues();
    const isUrban = values.locationType === "URBAIN";
    
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Résumé de l'adresse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Destinataire</h4>
              <p>{values.recipient}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Type d'adresse</h4>
              <p>{isUrban ? "Urbaine (Conakry)" : "Rurale"}</p>
            </div>
            
            {isUrban ? (
              <>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Commune</h4>
                  <p>{values.commune}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Quartier</h4>
                  <p>{values.district}</p>
                </div>
                {values.street && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Rue</h4>
                    <p>{values.street}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Région</h4>
                  <p>{values.region}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Préfecture</h4>
                  <p>{values.prefecture}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Sous-préfecture</h4>
                  <p>{values.subPrefecture}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Village</h4>
                  <p>{values.village}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Quartier</h4>
                  <p>{values.district}</p>
                </div>
              </>
            )}
            
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Repère</h4>
              <p>{values.landmark}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Coordonnées</h4>
              <p>Lat: {values.lat?.toFixed(6)}, Lng: {values.lng?.toFixed(6)}</p>
            </div>
            
            {values.deliveryInstructions && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Instructions de livraison</h4>
                <p>{values.deliveryInstructions}</p>
              </div>
            )}
            
            {values.photoUrl && (
              <div className="md:col-span-2">
                <h4 className="font-medium text-sm text-muted-foreground">Photo</h4>
                <img 
                  src={values.photoUrl} 
                  alt="Photo de l'adresse" 
                  className="mt-2 rounded-md w-full max-w-xs border"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {renderStepIndicator()}

        <motion.div
          key={step}
          initial={{ opacity: 0, y: step > 1 ? 50 : -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: step > 1 ? -50 : 50 }}
          transition={{ duration: 0.1 }}
        >
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="recipient"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destinataire <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex. John Doe" 
                          {...field} 
                          disabled={isPending}
                          className={form.formState.errors.recipient ? 'border-destructive' : ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="locationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type d'emplacement <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                        <FormControl>
                          <SelectTrigger className={form.formState.errors.locationType ? 'border-destructive' : ''}>
                            <SelectValue placeholder="Sélectionner un type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="URBAIN">Urbain (Conakry)</SelectItem>
                          <SelectItem value="RURAL">Rural</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="deliveryInstructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instructions de livraison (optionnel)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ex. Laisser le colis chez le gardien..."
                        rows={4}
                        {...field}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {step === 2 && form.watch("locationType") === "URBAIN" && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="commune"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commune <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                      <FormControl>
                        <SelectTrigger className={form.formState.errors.commune ? 'border-destructive' : ''}>
                          <SelectValue placeholder="Sélectionner une commune" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {["Kaloum", "Dixinn", "Ratoma", "Matam", "Matoto"].map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quartier <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex. Kipé (Conakry)" 
                        {...field} 
                        disabled={isPending}
                        className={form.formState.errors.district ? 'border-destructive' : ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rue (optionnel)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex. Rue 12" {...field} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="landmark"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repère <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex. Près de l'école" 
                        {...field} 
                        disabled={isPending}
                        className={form.formState.errors.landmark ? 'border-destructive' : ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {step === 2 && form.watch("locationType") === "RURAL" && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Région <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                      <FormControl>
                        <SelectTrigger className={form.formState.errors.region ? 'border-destructive' : ''}>
                          <SelectValue placeholder="Sélectionner une région" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {["BOKE", "KINDIA", "LABE", "MAMOU", "NZEREKORE", "FARANAH", "KANKAN"].map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="prefecture"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Préfecture <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex. Boké" 
                        {...field} 
                        disabled={isPending}
                        className={form.formState.errors.prefecture ? 'border-destructive' : ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subPrefecture"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sous-préfecture <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex. Kamsar" 
                        {...field} 
                        disabled={isPending}
                        className={form.formState.errors.subPrefecture ? 'border-destructive' : ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="village"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Village <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex. Village XYZ" 
                        {...field} 
                        disabled={isPending}
                        className={form.formState.errors.village ? 'border-destructive' : ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quartier <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex. Centre" 
                        {...field} 
                        disabled={isPending}
                        className={form.formState.errors.district ? 'border-destructive' : ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="landmark"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repère <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex. Près du marché" 
                        {...field} 
                        disabled={isPending}
                        className={form.formState.errors.landmark ? 'border-destructive' : ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2 overflow-y-scroll">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="photoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Photo de la devanture de l&apos;adresse (optionnel)</FormLabel>
                      <FormControl>
                        <Upload
                          value={field.value ? [field.value] : []}
                          onChange={(urls) => field.onChange(urls[0] || "")}
                          maxFiles={1}
                          maxSize={5}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <h3 className="text-lg font-semibold">Position sur la carte</h3>
                <div className="hidden">
                  <FormField
                    control={form.control}
                    name="lat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitude <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder="Ex. 9.5092"
                            {...field}
                            value={field.value ?? 9.5092}
                            onChange={(e) => {
                              const value = e.target.value ? parseFloat(e.target.value) : undefined;
                              field.onChange(value);
                              if (value && form.watch("lng")) {
                                setMapCenter({ lat: value, lng: form.watch("lng") });
                              }
                            }}
                            disabled={isPending}
                            className={form.formState.errors.lat ? 'border-destructive' : ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lng"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitude <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder="Ex. -13.7122"
                            {...field}
                            value={field.value ?? -13.7122}
                            onChange={(e) => {
                              const value = e.target.value ? parseFloat(e.target.value) : undefined;
                              field.onChange(value);
                              if (value && form.watch("lat")) {
                                setMapCenter({ lat: form.watch("lat"), lng: value });
                              }
                            }}
                            disabled={isPending}
                            className={form.formState.errors.lng ? 'border-destructive' : ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGetLocation}
                  disabled={isPending || isGeolocating}
                  className="w-full flex items-center gap-2"
                >
                  {isGeolocating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Localisation en cours...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4" /> 
                      Utiliser ma position
                    </>
                  )}
                </Button>
                <div className="h-[250px] mt-4 rounded-lg overflow-hidden border relative">
                  <Mapbox
                    center={mapCenter}
                    zoom={11}
                    onGeolocate={handleLocationSelect}
                    onClick={handleLocationSelect}
                    geolocateControl
                  />
                </div>
                <div>Vous pouvez cliquer sur la carte pour ajouter les coordonnées</div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              {renderAddressSummary()}
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">Vérifiez attentivement les informations</h4>
                <p className="text-blue-700 text-sm">
                  Assurez-vous que toutes les informations sont correctes avant de soumettre. 
                  Une fois créée, l'adresse ne pourra être modifiée que par le support client.
                </p>
              </div>
            </div>
          )}
        </motion.div>

        {error && <p className="text-destructive">{error}</p>}
        
        <div className="flex justify-between pt-4">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={isPending || isValidating}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Précédent
            </Button>
          )}
          {step < 4 ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={isPending || isValidating}
              className="ml-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Validation...
                </>
              ) : (
                <>
                  Suivant <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          ) : (
            <div className="flex gap-2 ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(3)}
                disabled={isPending}
              >
                Modifier
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-4"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  "Confirmer et créer l'adresse"
                )}
              </Button>
            </div>
          )}
        </div>
      </form>
    </Form>
  );
};