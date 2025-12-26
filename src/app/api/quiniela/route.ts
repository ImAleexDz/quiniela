import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
// import path from 'path';

const GOOGLE_SHEETS_ENABLED = true;

export async function GET(request: NextRequest) {
    try {
        // Check if required environment variables exist
        if (!process.env.GOOGLE_SHEET_ID) {
            return NextResponse.json({ 
                error: 'Missing GOOGLE_SHEET_ID environment variable' 
            }, { status: 500 });
        }

        // Get query parameters
        const { searchParams } = new URL(request.url);
        const sheetName = searchParams.get('sheet') || 'Liga MX'; // Default to Liga MX
        const range = searchParams.get('range') || 'A1:Z1000'; // Default range
        const fullRange = `${sheetName}!${range}`;

        console.log(`Fetching data from: ${fullRange}`);

        // Use JSON key file instead of environment variables
        const keyFilePath = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT as string);
        
        const auth = new google.auth.GoogleAuth({
            credentials: keyFilePath,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: fullRange,
        });

        const rows = response.data?.values;
        return NextResponse.json({ 
            message: 'Data fetched successfully',
            sheet: sheetName,
            range: range,
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

        const keyFilePath = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT as string);
        
        const auth = new google.auth.GoogleAuth({
            credentials: keyFilePath,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;

        // Get the source sheet name from the request, defaulting to Liga MX
        // This allows sending data from different source sheets like 'Ligas internacionales'
        const sourceSheet = body.sourceSheet || body.liga || 'Liga MX';
        console.log('Processing league:', body.liga);
        console.log('Fetching data from source sheet:', sourceSheet);
        console.log('Include both leagues:', body.includeBothLeagues);

        let allMatchesFromSheet = [];

        if (body.includeBothLeagues) {
            console.log('Fetching data from both Liga MX and Ligas internacionales');
            
            // Get Liga MX matches
            const ligaMXData = await sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId!,
                range: `Liga MX!A1:Z1000`,
            });
            const ligaMXRows = ligaMXData.data.values || [];
            const ligaMXMatches = ligaMXRows.slice(1).map(row => ({
                match_id: row[0],
                home_team: row[1],
                away_team: row[2],
                league: row[3],
                jornada: row[4]
            }));

            // Get International matches
            const internationalData = await sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId!,
                range: `Ligas internacionales!A1:Z1000`,
            });
            const internationalRows = internationalData.data.values || [];
            const internationalMatches = internationalRows.slice(1).map(row => ({
                match_id: row[0],
                home_team: row[1],
                away_team: row[2],
                league: row[3],
                jornada: row[4] // This might be undefined for international matches
            }));

            // Combine all matches
            allMatchesFromSheet = [...ligaMXMatches, ...internationalMatches];
            console.log('Combined matches from both leagues:', allMatchesFromSheet.length);
        } else {
            // Single league mode (original behavior)
            const originalData = await sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId!,
                range: `${sourceSheet}!A1:Z1000`,
            });
            const originalRows = originalData.data.values || [];
            allMatchesFromSheet = originalRows.slice(1).map(row => ({
                match_id: row[0],
                home_team: row[1],
                away_team: row[2],
                league: row[3],
                jornada: row[4]
            }));
        }

        console.log('Matches from sheet:', allMatchesFromSheet);

        // Get spreadsheet info to check existing sheets
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: spreadsheetId!
        });

        // Create sheet name based on jornada only
        const jornadaSheetName = `J${body.jornada}`;
        
        console.log('Sheet name will be:', jornadaSheetName);
        
        // Check if sheet already exists
        const existingSheet = spreadsheet.data.sheets?.find(
            sheet => sheet.properties?.title === jornadaSheetName
        );

        let sheetId: number;

        let currentHeaders: string[] = [];
        
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
            const matchHeaders = allMatchesFromSheet.map(match => 
                `${match.home_team} vs ${match.away_team}`
            );
            
            currentHeaders = ['Nombre', ...matchHeaders, 'Fecha de envío'];
            console.log('Creating headers:', currentHeaders);

            await sheets.spreadsheets.values.update({
                spreadsheetId: spreadsheetId!,
                range: `${jornadaSheetName}!A1:${String.fromCharCode(65 + currentHeaders.length - 1)}1`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [currentHeaders]
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
                                endColumnIndex: currentHeaders.length
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
            
            // Get existing headers to check if we need to add new matches
            const existingHeadersResponse = await sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId!,
                range: `${jornadaSheetName}!1:1`,
            });
            
            const existingHeaderRow = existingHeadersResponse.data.values?.[0] || [];
            console.log('Existing headers:', existingHeaderRow);
            
            // Check if we need to add new match headers
            const newMatchHeaders = allMatchesFromSheet
                .map(match => `${match.home_team} vs ${match.away_team}`)
                .filter(matchHeader => !existingHeaderRow.includes(matchHeader));
            
            if (newMatchHeaders.length > 0) {
                console.log('Adding new match headers:', newMatchHeaders);
                
                // Find the position to insert new headers (before "Fecha de envío")
                const dateColumnIndex = existingHeaderRow.indexOf('Fecha de envío');
                const insertPosition = dateColumnIndex > -1 ? dateColumnIndex : existingHeaderRow.length;
                
                // Create updated headers array
                const updatedHeaders = [...existingHeaderRow];
                updatedHeaders.splice(insertPosition, 0, ...newMatchHeaders);
                
                // Update the header row
                await sheets.spreadsheets.values.update({
                    spreadsheetId: spreadsheetId!,
                    range: `${jornadaSheetName}!A1:${String.fromCharCode(65 + updatedHeaders.length - 1)}1`,
                    valueInputOption: 'USER_ENTERED',
                    requestBody: {
                        values: [updatedHeaders]
                    }
                });
                
                currentHeaders = updatedHeaders;
                console.log('Headers updated:', currentHeaders);
            } else {
                currentHeaders = existingHeaderRow;
                console.log('No new headers needed');
            }
        }

        // Prepare row data based on current headers order
        const predictions = [];
        
        // For each header (excluding 'Nombre' and 'Fecha de envío'), find the corresponding prediction
        for (let i = 1; i < currentHeaders.length - 1; i++) {
            const headerText = currentHeaders[i];
            
            // Find the match that corresponds to this header
            const correspondingMatch = allMatchesFromSheet.find(match => 
                `${match.home_team} vs ${match.away_team}` === headerText
            );
            
            if (correspondingMatch) {
                const selection = body.selecciones[correspondingMatch.match_id];
                
                // Convert selection to readable format
                if (selection && selection.startsWith('gana_local_')) {
                    predictions.push('Local');
                } else if (selection === 'empate') {
                    predictions.push('Empate');
                } else if (selection && selection.startsWith('gana_visitante_')) {
                    predictions.push('Visitante');
                } else if (selection && /^\d+-\d+$/.test(selection)) {
                    // Handle marcador format (e.g., "3-2", "1-1", "0-1")
                    predictions.push(selection);
                } else {
                    predictions.push('No seleccionado');
                }
            } else {
                // This match is not in the current submission, mark as not selected
                predictions.push('No seleccionado');
            }
        }

        const rowData = [
            body.nombre,
            ...predictions,
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