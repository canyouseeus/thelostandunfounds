-- Delete orders and entitlements for the test email to reset purchase state
DO $$
DECLARE
    test_email TEXT := 'thelostandunfounds@gmail.com';
BEGIN
    -- Delete entitlements linked to orders from this email
    DELETE FROM photo_entitlements 
    WHERE order_id IN (SELECT id FROM photo_orders WHERE email = test_email);

    -- Delete the orders themselves
    DELETE FROM photo_orders 
    WHERE email = test_email;
END $$;
