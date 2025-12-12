import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import path from 'path';

const GOOGLE_SHEETS_ENABLED = true;

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
            range: 'Liga MX!A1:Z1000',
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
    if (!GOOGLE_SHEETS_ENABLED) {
        const body = await request.json();
        console.log('Form data (Google Sheets disabled):', body);
        return NextResponse.json({ 
            success: true, 
            message: 'Data received (Google Sheets disabled)' 
        });
    }

    try {
        if (!process.env.GOOGLE_SHEET_ID) {
            return NextResponse.json({ 
                error: 'Missing GOOGLE_SHEET_ID environment variable' 
            }, { status: 500 });
        }

        const body = await request.json();
        console.log('Received form data:', body);

        const keyFilePath = path.join(process.cwd(), 'service-account-key.json');
        
        const auth = new google.auth.GoogleAuth({
            keyFile: keyFilePath,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;

        // First, get the original match data to create proper headers
        const originalData = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId!,
            range: 'Hoja 1!A1:Z1000',
        });

        const originalRows = originalData.data.values || [];
        console.log('Original data retrieved, rows:', originalRows.length);

        // Extract matches from original data (skip header row)
        const matchesFromSheet = originalRows.slice(1).map(row => ({
            match_id: row[0],
            home_team: row[1],
            away_team: row[2],
            league: row[3],
            jornada: row[4]
        }));

        console.log('Matches from sheet:', matchesFromSheet);

        // Get spreadsheet info to check existing sheets
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: spreadsheetId!
        });

        // Create sheet name based on jornada
        const jornadaSheetName = `J${body.jornada}`;
        
        // Check if sheet already exists
        const existingSheet = spreadsheet.data.sheets?.find(
            sheet => sheet.properties?.title === jornadaSheetName
        );

        let sheetId: number;

        if (!existingSheet) {
            console.log(`Creating new sheet: ${jornadaSheetName}`);
            
            // Create new sheet for this jornada
            const addSheetResponse = await sheets.spreadsheets.batchUpdate({
                spreadsheetId: spreadsheetId!,
                requestBody: {
                    requests: [{
                        addSheet: {
                            properties: {
                                title: jornadaSheetName,
                                gridProperties: {
                                    rowCount: 1000,
                                    columnCount: 50
                                }
                            }
                        }
                    }]
                }
            });
            
            sheetId = addSheetResponse.data.replies?.[0]?.addSheet?.properties?.sheetId || 0;
            console.log(`Sheet created with ID: ${sheetId}`);

            // Create headers based on actual match data
            const matchHeaders = matchesFromSheet.map(match => 
                `${match.home_team} vs ${match.away_team}`
            );
            
            const headers = ['Nombre', ...matchHeaders, 'Liga', 'Jornada', 'Fecha de envío'];
            console.log('Creating headers:', headers);

            await sheets.spreadsheets.values.update({
                spreadsheetId: spreadsheetId!,
                range: `${jornadaSheetName}!A1:${String.fromCharCode(65 + headers.length - 1)}1`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [headers]
                }
            });

            // Style the header row
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: spreadsheetId!,
                requestBody: {
                    requests: [{
                        repeatCell: {
                            range: {
                                sheetId: sheetId,
                                startRowIndex: 0,
                                endRowIndex: 1,
                                startColumnIndex: 0,
                                endColumnIndex: headers.length
                            },
                            cell: {
                                userEnteredFormat: {
                                    backgroundColor: {
                                        red: 0.2,
                                        green: 0.6,
                                        blue: 1.0
                                    },
                                    textFormat: {
                                        bold: true,
                                        foregroundColor: {
                                            red: 1.0,
                                            green: 1.0,
                                            blue: 1.0
                                        }
                                    }
                                }
                            },
                            fields: 'userEnteredFormat(backgroundColor,textFormat)'
                        }
                    }]
                }
            });
            
            console.log('Sheet styling completed');
        } else {
            console.log(`Using existing sheet: ${jornadaSheetName}`);
        }

        // Prepare row data based on match order from original sheet
        const predictions = matchesFromSheet.map(match => {
            const selection = body.selecciones[match.match_id];
            
            // Convert selection to readable format
            if (selection && selection.startsWith('gana_local_')) {
                return 'Local';
            } else if (selection === 'empate') {
                return 'Empate';
            } else if (selection && selection.startsWith('gana_visitante_')) {
                return 'Visitante';
            } else {
                return 'No seleccionado';
            }
        });

        const rowData = [
            body.nombre,
            ...predictions,
            body.liga,
            body.jornada,
            new Date(body.fecha).toLocaleString('es-MX', { 
                timeZone: 'America/Mexico_City',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            })
        ];

        console.log('Adding row data:', rowData);

        // Append the new row
        await sheets.spreadsheets.values.append({
            spreadsheetId: spreadsheetId!,
            range: `${jornadaSheetName}!A:Z`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [rowData]
            }
        });

        console.log('Data successfully saved');

        return NextResponse.json({ 
            success: true, 
            message: `Quiniela de ${body.nombre} guardada en hoja ${jornadaSheetName}`,
            sheetName: jornadaSheetName,
            data: rowData
        });
        
    } catch (error) {
        console.error('Error saving to Google Sheets:', error);
        
        if (error instanceof Error) {
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }
        
        return NextResponse.json({ 
            error: 'Failed to save data',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}