import java.util.*;
import java.util.ArrayList;


public class Cell {
	
	
	Coordinates []t=new Coordinates[5] ; // Valeur de chaque cas possible: Dx, Dy, Lx, Ly, Match
	
	boolean []allMin=new boolean[5]; // allMin[i] = true si Coordinates[i] est un minimum, false sinon
	
	// 0:Dx, 1:Dy, 2:Lx, 3:Ly, 4:Match 
	
	// obtFrom contient les coordonnees des cellules pointees par cette cellule
	
	
	public int value;
	
	
	
	public Cell()
	{
		
		for (int i=0; i<t.length; i++)
		{
			 t[i]=new Coordinates();
			 allMin[i]=false;
		}
			 
	}
	
	
	public void setZero()
	{
		
		for (int i=0; i<t.length; i++)
			 t[i].value=0;
		
		this.value=0;
		
		
	}
	
	
	public int getValue()
	{
		
		return this.value;
		
	}
	
	
	public void update_allMin(int j) // mettre true toutes les valeurs == a allMin[j]
	
	{
		
		for (int i=0; i<allMin.length; i++)
			
			if (t[i].value==t[j].value) allMin[i]=true;
		
		
	}
	
	
	
	
	/*
	
	public int getCMin()
	
	{
		
		
		int min=999999;
		
		for (int i=0; i<t.length; i++)
			
		{
			if (t[i].value<min) min=t[i].value;
			
		}
		
	
		
	 return min;	
		
		
	}
	
	
	*/
	
	
	
	public int getCMin()
	
		{
			int j=0;
		
			int min=999999;
		
			for (int i=t.length-1; i>=0; i--)
			
			{
				if (t[i].value<min) 
				
				{
				
					min=t[i].value;
					j=i;
				
				}	
				
			}
		
			allMin[j]=true;
			
			update_allMin(j);
		
			return min;	
		
		
		}
	
	
	
	
	
	
	
	
	public ArrayList<Coordinates> createCoorList()
	
		{
		
		ArrayList<Coordinates> coorList=new ArrayList<Coordinates>();
		
		if (t[0].getValue()==value)   //Si une duplication dans X
			coorList.add(t[0]);
			
		if(t[3].getValue()==value && t[3].x!=t[0].x) //Si une perte dans Y
				coorList.add(t[3]);
				
			
		if (t[1].getValue()==value) //Si une duplication dans Y
		      coorList.add(t[1]);
			
		if(t[2].getValue()==value && t[2].y!=t[1].y) // Si une perte dans X
				coorList.add(t[2]);
				
		
		if(t[4].getValue()==value) coorList.add(t[4]); //si un Match
		
		
		/*
		
		for (int i=0; i<t.length; i++)
			
			{
			System.out.println (t[i].value);
			
			}
		
		
		
		
		System.out.println("taille est "+coorList.size());
		
		for (Coordinates c:coorList)
			 
			
			System.out.println("val ="+c.value+"y= "+c.y+"x= "+c.x);
		
		
		*/
		
		return coorList;
		
		
		}
	
	
	
	
	
	
	
	
	
	
}