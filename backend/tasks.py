import time

def generate_receipt_pdf(order_id):
    print(f"Generating PDF for order {order_id}...")
    # Simulate PDF generation
    time.sleep(2)
    print(f"PDF generated for order {order_id}")
    # In real app: save to S3/disk and update DB
    return f"/receipts/{order_id}.pdf"

def print_receipt(order_id):
    print(f"Printing receipt for order {order_id}...")
    # Simulate printing
    time.sleep(1)
    print(f"Receipt printed for order {order_id}")
