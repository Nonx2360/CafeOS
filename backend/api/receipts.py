from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, Response
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.db import get_session
from backend.models import Order, OrderItem, MenuItem, Receipt, Table
from datetime import datetime
from io import BytesIO

router = APIRouter(prefix="/api/receipts", tags=["receipts"])

def format_price(cents: int) -> str:
    """Convert cents to dollar string"""
    return f"${cents / 100:.2f}"

def generate_receipt_html(order: Order, items_with_names: list, table_number: str = None) -> str:
    """Generate printable HTML receipt - thermal printer style"""
    
    items_html = ""
    for item in items_with_names:
        item_total = item['quantity'] * item['unit_price_cents']
        items_html += f"""
        <tr>
            <td class="item-name">{item['quantity']}× {item['name']}</td>
            <td class="item-price">{format_price(item_total)}</td>
        </tr>
        """

    # Format date nicely
    date_str = order.created_at.strftime('%Y-%m-%d %H:%M')
    order_num = order.order_number.split('-')[-1] if '-' in order.order_number else order.order_number

    receipt_html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Receipt - {order.order_number}</title>
    <style>
        @page {{
            size: 80mm auto;
            margin: 0;
        }}
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: 'Courier New', 'Consolas', monospace;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            background: #f5f5f5;
            padding: 20px;
        }}
        .receipt {{
            width: 240px;
            background: #fff;
            margin: 0 auto;
            padding: 20px 15px;
            border: 1px solid #ddd;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }}
        .header {{
            text-align: center;
            padding-bottom: 12px;
            border-bottom: 1px dashed #ccc;
            margin-bottom: 12px;
        }}
        .header h1 {{
            font-size: 22px;
            font-weight: bold;
            font-family: Georgia, serif;
            margin-bottom: 4px;
        }}
        .header p {{
            font-size: 10px;
            color: #888;
            font-style: italic;
        }}
        .info {{
            padding: 10px 0;
            border-bottom: 1px dashed #ccc;
            margin-bottom: 10px;
        }}
        .info p {{
            margin: 4px 0;
            font-size: 11px;
        }}
        .info span.label {{
            color: #666;
        }}
        .info span.value {{
            font-weight: bold;
        }}
        .items {{
            width: 100%;
            margin-bottom: 10px;
            border-collapse: collapse;
        }}
        .items td {{
            padding: 6px 0;
            vertical-align: top;
        }}
        .item-name {{
            font-size: 11px;
        }}
        .item-price {{
            text-align: right;
            font-size: 11px;
            white-space: nowrap;
        }}
        .totals {{
            border-top: 1px dashed #ccc;
            padding-top: 10px;
            margin-top: 10px;
        }}
        .totals-row {{
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
            font-size: 11px;
        }}
        .totals-row.total {{
            font-size: 14px;
            font-weight: bold;
            margin-top: 10px;
            padding-top: 8px;
            border-top: 1px solid #333;
        }}
        .footer {{
            text-align: center;
            margin-top: 15px;
            padding-top: 12px;
            border-top: 1px dashed #ccc;
            font-size: 10px;
            color: #888;
            font-style: italic;
        }}
        .footer p {{
            margin: 3px 0;
        }}
        .footer .powered {{
            margin-top: 8px;
            font-size: 9px;
            color: #aaa;
        }}
        @media print {{
            body {{
                padding: 0;
                background: #fff;
            }}
            .receipt {{
                border: none;
                box-shadow: none;
            }}
            .no-print {{
                display: none !important;
            }}
        }}
    </style>
</head>
<body>
    <div class="receipt">
        <div class="header">
            <h1>CafeOS</h1>
            <p>Thank you for your order!</p>
        </div>
        
        <div class="info">
            <p><span class="label">Order #:</span> <span class="value">{order_num}</span></p>
            <p><span class="label">Date:</span> <span class="value">{date_str}</span></p>
            {"<p><span class='label'>Table:</span> <span class='value'>" + str(table_number) + "</span></p>" if table_number else ""}
        </div>
        
        <table class="items">
            <tbody>
                {items_html}
            </tbody>
        </table>
        
        <div class="totals">
            <div class="totals-row">
                <span>Subtotal</span>
                <span>{format_price(order.total_cents)}</span>
            </div>
            <div class="totals-row">
                <span>Tax (0%)</span>
                <span>$0.00</span>
            </div>
            <div class="totals-row total">
                <span>TOTAL</span>
                <span>{format_price(order.total_cents)}</span>
            </div>
        </div>
        
        <div class="footer">
            <p>Thank you for dining with us!</p>
            <p>Visit again soon</p>
            <p class="powered">Powered by CafeOS</p>
        </div>
    </div>
    
    <div class="no-print" style="text-align: center; margin-top: 20px;">
        <button onclick="window.print()" style="
            padding: 10px 20px;
            font-size: 13px;
            background: #e07848;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
        ">
            Print Receipt
        </button>
    </div>
</body>
</html>
    """
    return receipt_html


@router.get("/{order_id}", response_class=HTMLResponse)
async def get_receipt_html(order_id: int, session: AsyncSession = Depends(get_session)):
    """Get printable HTML receipt for an order"""
    
    # Get order with items
    statement = select(Order).where(Order.id == order_id).options(selectinload(Order.items))
    result = await session.execute(statement)
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get table number
    table_number = None
    if order.table_id:
        table = await session.get(Table, order.table_id)
        if table:
            table_number = table.number
    
    # Get menu item names for each order item
    items_with_names = []
    for item in order.items:
        menu_item = await session.get(MenuItem, item.menu_item_id)
        items_with_names.append({
            'name': menu_item.name if menu_item else f"Item #{item.menu_item_id}",
            'quantity': item.quantity,
            'unit_price_cents': item.unit_price_cents,
            'instructions': item.instructions
        })
    
    html = generate_receipt_html(order, items_with_names, table_number)
    return HTMLResponse(content=html)


@router.get("/{order_id}/pdf")
async def get_receipt_pdf(order_id: int, session: AsyncSession = Depends(get_session)):
    """Get PDF receipt for an order using fpdf2"""
    
    from fpdf import FPDF
    
    # Get order with items
    statement = select(Order).where(Order.id == order_id).options(selectinload(Order.items))
    result = await session.execute(statement)
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get table number
    table_number = None
    if order.table_id:
        table = await session.get(Table, order.table_id)
        if table:
            table_number = table.number
    
    # Get menu item names
    items_with_names = []
    for item in order.items:
        menu_item = await session.get(MenuItem, item.menu_item_id)
        items_with_names.append({
            'name': menu_item.name if menu_item else f"Item #{item.menu_item_id}",
            'quantity': item.quantity,
            'unit_price_cents': item.unit_price_cents,
            'instructions': item.instructions
        })
    
    # Create PDF with receipt width (80mm)
    pdf = FPDF(unit='mm', format=(80, 200))
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=5)
    
    # Header
    pdf.set_font('Helvetica', 'B', 16)
    pdf.cell(0, 8, 'CafeOS', align='C', new_x='LMARGIN', new_y='NEXT')
    
    pdf.set_font('Helvetica', 'I', 8)
    pdf.set_text_color(128, 128, 128)
    pdf.cell(0, 4, 'Thank you for your order!', align='C', new_x='LMARGIN', new_y='NEXT')
    
    # Dashed line
    pdf.set_text_color(0, 0, 0)
    pdf.set_draw_color(200, 200, 200)
    pdf.dashed_line(5, pdf.get_y() + 3, 75, pdf.get_y() + 3, 1, 1)
    pdf.ln(6)
    
    # Order info
    pdf.set_font('Helvetica', '', 9)
    order_num = order.order_number.split('-')[-1] if '-' in order.order_number else order.order_number
    date_str = order.created_at.strftime('%Y-%m-%d %H:%M')
    
    pdf.cell(20, 5, 'Order #:', new_x='RIGHT')
    pdf.set_font('Helvetica', 'B', 9)
    pdf.cell(0, 5, order_num, new_x='LMARGIN', new_y='NEXT')
    
    pdf.set_font('Helvetica', '', 9)
    pdf.cell(20, 5, 'Date:', new_x='RIGHT')
    pdf.set_font('Helvetica', 'B', 9)
    pdf.cell(0, 5, date_str, new_x='LMARGIN', new_y='NEXT')
    
    if table_number:
        pdf.set_font('Helvetica', '', 9)
        pdf.cell(20, 5, 'Table:', new_x='RIGHT')
        pdf.set_font('Helvetica', 'B', 9)
        pdf.cell(0, 5, str(table_number), new_x='LMARGIN', new_y='NEXT')
    
    # Dashed line
    pdf.dashed_line(5, pdf.get_y() + 3, 75, pdf.get_y() + 3, 1, 1)
    pdf.ln(6)
    
    # Items
    pdf.set_font('Helvetica', '', 9)
    for item in items_with_names:
        item_total = item['quantity'] * item['unit_price_cents']
        item_text = f"{item['quantity']}x {item['name']}"
        price_text = format_price(item_total)
        
        # Calculate width for price column
        price_width = pdf.get_string_width(price_text) + 2
        item_width = 70 - price_width
        
        pdf.cell(item_width, 5, item_text[:30], new_x='RIGHT')  # Truncate long names
        pdf.cell(price_width, 5, price_text, align='R', new_x='LMARGIN', new_y='NEXT')
    
    # Totals section
    pdf.dashed_line(5, pdf.get_y() + 3, 75, pdf.get_y() + 3, 1, 1)
    pdf.ln(6)
    
    # Subtotal
    pdf.cell(50, 5, 'Subtotal', new_x='RIGHT')
    pdf.cell(20, 5, format_price(order.total_cents), align='R', new_x='LMARGIN', new_y='NEXT')
    
    # Tax
    pdf.cell(50, 5, 'Tax (0%)', new_x='RIGHT')
    pdf.cell(20, 5, '$0.00', align='R', new_x='LMARGIN', new_y='NEXT')
    
    # Total line
    pdf.set_draw_color(0, 0, 0)
    pdf.line(5, pdf.get_y() + 2, 75, pdf.get_y() + 2)
    pdf.ln(5)
    
    # Total
    pdf.set_font('Helvetica', 'B', 12)
    pdf.cell(50, 6, 'TOTAL', new_x='RIGHT')
    pdf.cell(20, 6, format_price(order.total_cents), align='R', new_x='LMARGIN', new_y='NEXT')
    
    # Footer
    pdf.ln(5)
    pdf.dashed_line(5, pdf.get_y(), 75, pdf.get_y(), 1, 1)
    pdf.ln(5)
    
    pdf.set_font('Helvetica', 'I', 8)
    pdf.set_text_color(128, 128, 128)
    pdf.cell(0, 4, 'Thank you for dining with us!', align='C', new_x='LMARGIN', new_y='NEXT')
    pdf.cell(0, 4, 'Visit again soon', align='C', new_x='LMARGIN', new_y='NEXT')
    pdf.ln(3)
    pdf.set_font('Helvetica', '', 6)
    pdf.cell(0, 3, 'Powered by CafeOS', align='C', new_x='LMARGIN', new_y='NEXT')
    
    # Output PDF
    pdf_buffer = BytesIO()
    pdf.output(pdf_buffer)
    pdf_buffer.seek(0)
    
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=receipt-{order.order_number}.pdf"
        }
    )


@router.post("/{order_id}/save")
async def save_receipt(order_id: int, session: AsyncSession = Depends(get_session)):
    """Save receipt to database and mark as generated"""
    
    # Check if order exists
    order = await session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if receipt already exists
    statement = select(Receipt).where(Receipt.order_id == order_id)
    result = await session.execute(statement)
    existing = result.scalar_one_or_none()
    
    if existing:
        return {"message": "Receipt already exists", "receipt_id": existing.id}
    
    # Create receipt record
    receipt = Receipt(
        order_id=order_id,
        printed=False
    )
    session.add(receipt)
    await session.commit()
    await session.refresh(receipt)
    
    return {"message": "Receipt saved", "receipt_id": receipt.id}


@router.post("/{order_id}/mark-printed")
async def mark_receipt_printed(order_id: int, session: AsyncSession = Depends(get_session)):
    """Mark a receipt as printed"""
    
    statement = select(Receipt).where(Receipt.order_id == order_id)
    result = await session.execute(statement)
    receipt = result.scalar_one_or_none()
    
    if not receipt:
        # Create one if it doesn't exist
        receipt = Receipt(order_id=order_id, printed=True)
        session.add(receipt)
    else:
        receipt.printed = True
    
    await session.commit()
    await session.refresh(receipt)
    
    return {"message": "Receipt marked as printed", "receipt_id": receipt.id}
