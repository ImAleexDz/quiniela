import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import path from 'path';


export async function GET(request: NextRequest) {
    try {
        // Check if required environment variables exist
        if (!process.env.GOOGLE_SHEET_ID) {
            return NextResponse.json({ 
                error: 'Missing GOOGLE_SHEET_ID environment variable' 
            }, { status: 500 });
        }

        // Use JSON key file instead of environment variables
        const keyFilePath = path.join(process.cwd(), 'service-account-key.json');
        
        const auth = new google.auth.GoogleAuth({
            keyFile: keyFilePath,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Hoja 1!A1:Z1000',
        });

        const rows = response.data.values;
        return NextResponse.json({ 
            message: 'Data fetched successfully', 
            data: rows || [],
            rowCount: rows?.length || 0
        });
        
    } catch (error) {
        console.error('Error accessing Google Sheets API:', error);
        return NextResponse.json({ 
            error: 'Failed to fetch Google Sheets data',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        // Check if required environment variables exist
        if (!process.env.GOOGLE_SHEET_ID) {
            return NextResponse.json({ 
                error: 'Missing GOOGLE_SHEET_ID environment variable' 
            }, { status: 500 });
        }

        const body = await request.json();
        const keyFilePath = path.join(process.cwd(), 'service-account-key.json');

        const auth = new google.auth.GoogleAuth({
            keyFile: keyFilePath,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        
        await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Hoja 1!A:Z',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[
                    body.nombre || '',
                    JSON.stringify(body.selecciones || {}),
                    body.fecha || new Date().toISOString()
                ]]
            }
        });

        return NextResponse.json({ success: true, message: 'Data saved successfully' });
        
    } catch (error) {
        console.error('Error saving to Google Sheets:', error);
        return NextResponse.json({ 
            error: 'Failed to save data',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}