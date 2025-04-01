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
import { MapPin, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Map } from '@/components/Map';

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

  const handleLocationSelect = (location: { lat: number; lng: number }) => {
    form.setValue("lat", location.lat);
    form.setValue("lng", location.lng);
    setMapCenter(location);
  };

  const onSubmit = (values: AddressFormValues) => {
    startTransition(() => {
      try {
        const region = values.locationType === "URBAIN" ? "CONAKRY" : values.region!;
        const postalCode = generatePostalCode(region, values.locationType, values);
        const location =
          values.locationType === "URBAIN"
            ? { type: "URBAIN" as const, commune: values.commune as ConakryCommune, district: values.district, street: values.street, landmark: values.landmark }
            : { type: "RURAL" as const, prefecture: values.prefecture || "", subPrefecture: values.subPrefecture || "", village: values.village || "", district: values.district, landmark: values.landmark };
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
    const fields: (keyof AddressFormValues)[] = 
      step === 1 ? ["recipient", "locationType"] : 
      step === 2 ? (form.watch("locationType") === "URBAIN" ? ["commune", "district", "landmark"] : ["region", "prefecture", "subPrefecture", "village", "district", "landmark"]) : 
      step === 3 ? ["lat", "lng"] : 
      [];
    
    const isValid = await form.trigger(fields);
    if (isValid && step < 3) {
      setStep(step + 1);
    } else if (!isValid) {
      toast.error("Veuillez remplir tous les champs requis correctement.");
    }
  };

  const renderStepIndicator = () => (
    <div className="flex justify-between mb-8 relative">
      <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2 -z-10">
        <motion.div 
          className="h-full bg-primary"
          initial={{ width: "0%" }}
          animate={{ width: `${(step / 3) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      {[1, 2, 3].map((stepNumber) => (
        <div 
          key={stepNumber} 
          className={`flex flex-col items-center cursor-pointer ${step >= stepNumber ? 'text-primary' : 'text-muted-foreground'}`}
          onClick={() => stepNumber < step && setStep(stepNumber)}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= stepNumber ? 'bg-primary text-white border-primary' : 'bg-white border-gray-300'}`}>
            {step > stepNumber ? <CheckCircle2 className="h-5 w-5" /> : stepNumber}
          </div>
          <span className="text-xs mt-2 font-medium">
            {stepNumber === 1 ? 'Destinataire' : 
             stepNumber === 2 ? 'Adresse' : 
             'Localisation'}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <Form {...form}>
      <form onSubmit={(e) => {
        e.preventDefault();
        if (step === 3) {
          form.handleSubmit(onSubmit)();
        }
      }} className="space-y-6">
        {renderStepIndicator()}

        <motion.div
          key={step}
          initial={{ opacity: 0, x: step > 1 ? 50 : -50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: step > 1 ? -50 : 50 }}
          transition={{ duration: 0.3 }}
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
            <div className="space-y-6">
              <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="photoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Photo de l'adresse (optionnel)</FormLabel>
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
                            value={field.value ?? 0}
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
                            value={field.value ?? 0}
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
                  <Map
                    center={mapCenter}
                    zoom={14}
                    onLocationSelect={handleLocationSelect}
                    className="absolute inset-0"
                  />
                </div>
                <div>Vous pouvez cliquer sur la carte pour ajouter les coordonées</div>
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
              disabled={isPending}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Précédent
            </Button>
          )}
          {step < 3 ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={isPending}
              className="ml-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              Suivant <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={isPending}
              className="ml-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {isPending ? "Création..." : "Créer l'adresse"}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
};