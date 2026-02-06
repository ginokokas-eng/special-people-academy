import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface CartItem {
  id: string;
  course_id: string;
  offering_id: string;
  participants_count: number;
  regulated_certification: boolean;
  course?: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    delivery_type: string | null;
  };
  offering?: {
    id: string;
    offering_type: string;
    base_price_gbp: number;
    max_participants: number | null;
  };
}

interface CartContextValue {
  items: CartItem[];
  loading: boolean;
  itemCount: number;
  addToCart: (params: {
    courseId: string;
    offeringId: string;
    participantsCount?: number;
    regulatedCertification?: boolean;
  }) => Promise<boolean>;
  removeFromCart: (itemId: string) => Promise<void>;
  updateItem: (itemId: string, updates: Partial<Pick<CartItem, 'participants_count' | 'regulated_certification'>>) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  getTotal: () => { subtotal: number; regulatedFees: number; total: number };
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

const REGULATED_CERT_FEE = 15;

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCart = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          course_id,
          offering_id,
          participants_count,
          regulated_certification
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch course and offering details separately
      const enrichedItems = await Promise.all(
        (data || []).map(async (item) => {
          const [courseRes, offeringRes] = await Promise.all([
            supabase
              .from('courses')
              .select('id, title, thumbnail_url, delivery_type')
              .eq('id', item.course_id)
              .single(),
            supabase
              .from('course_offerings')
              .select('id, offering_type, base_price_gbp, max_participants')
              .eq('id', item.offering_id)
              .single()
          ]);

          return {
            ...item,
            course: courseRes.data || undefined,
            offering: offeringRes.data || undefined,
          };
        })
      );

      setItems(enrichedItems);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (params: {
    courseId: string;
    offeringId: string;
    participantsCount?: number;
    regulatedCertification?: boolean;
  }): Promise<boolean> => {
    if (!user) {
      toast.error('Please sign in to add items to cart');
      return false;
    }

    try {
      // Check if course already in cart
      const existing = items.find(item => item.course_id === params.courseId);
      if (existing) {
        toast.info('This course is already in your basket');
        return true;
      }

      const { error } = await supabase
        .from('cart_items')
        .insert({
          user_id: user.id,
          course_id: params.courseId,
          offering_id: params.offeringId,
          participants_count: params.participantsCount || 1,
          regulated_certification: params.regulatedCertification || false,
        });

      if (error) throw error;

      await fetchCart();
      return true;
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      if (error.code === '23505') {
        toast.info('This course is already in your basket');
        return true;
      }
      toast.error('Failed to add to basket');
      return false;
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setItems(prev => prev.filter(item => item.id !== itemId));
      toast.success('Removed from basket');
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast.error('Failed to remove item');
    }
  };

  const updateItem = async (
    itemId: string,
    updates: Partial<Pick<CartItem, 'participants_count' | 'regulated_certification'>>
  ) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;

      setItems(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, ...updates } : item
        )
      );
    } catch (error) {
      console.error('Error updating cart item:', error);
      toast.error('Failed to update item');
    }
  };

  const clearCart = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setItems([]);
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const getTotal = () => {
    let subtotal = 0;
    let regulatedFees = 0;

    items.forEach(item => {
      if (item.offering) {
        subtotal += item.offering.base_price_gbp;
        if (item.regulated_certification) {
          regulatedFees += item.participants_count * REGULATED_CERT_FEE;
        }
      }
    });

    return {
      subtotal,
      regulatedFees,
      total: subtotal + regulatedFees,
    };
  };

  return (
    <CartContext.Provider
      value={{
        items,
        loading,
        itemCount: items.length,
        addToCart,
        removeFromCart,
        updateItem,
        clearCart,
        refreshCart: fetchCart,
        getTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
