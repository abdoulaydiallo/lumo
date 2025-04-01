import { AddressList } from "@/features/addresses/components/AddressList";
import { getUser } from "@/lib/auth";

export default async function AddressPage () {
    const user = await getUser();
    if (!user) {
        throw new Error("User not found");
    }
    return (
        <div className="container mx-auto py-6">
            <AddressList userId={user.id} />
        </div>
    );
}