import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Smartphone, Wallet } from "lucide-react"
import { Input } from "@/components/ui/input"

export function PaymentMethods({
  selectedMethod,
  onSelect,
  onPhoneNumberChange
}: {
  selectedMethod?: string
  onSelect: (method: string) => void
  onPhoneNumberChange?: (phone: string) => void
}) {
  return (
    <div className="space-y-4">
      <RadioGroup value={selectedMethod} onValueChange={onSelect}>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <RadioGroupItem value="orange_money" id="orange-money" />
            <label htmlFor="orange-money" className="flex-1 flex items-center gap-4">
              <div className="bg-orange-500 p-2 rounded-full">
                <Smartphone className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium">Orange Money</p>
                <p className="text-sm text-muted-foreground">Paiement sécurisé via Orange</p>
              </div>
            </label>
          </CardContent>
          {selectedMethod === "orange_money" && (
            <div className="px-4 pb-4">
              <Input 
                placeholder="Numéro Orange Money" 
                onChange={(e) => onPhoneNumberChange?.(e.target.value)}
              />
            </div>
          )}
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <RadioGroupItem value="cash_on_delivery" id="cash-on-delivery" />
            <label htmlFor="cash-on-delivery" className="flex-1 flex items-center gap-4">
              <div className="bg-primary p-2 rounded-full">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium">Paiement à la livraison</p>
                <p className="text-sm text-muted-foreground">Payez en espèces quand vous recevez votre commande</p>
                <Badge variant="secondary" className="mt-1">
                  +5 000 GNF de frais
                </Badge>
              </div>
            </label>
          </CardContent>
        </Card>
      </RadioGroup>
    </div>
  )
}